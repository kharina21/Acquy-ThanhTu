import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import StoreSettings from '../models/StoreSettings.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import { getOnlineLocation } from './locationController.js';
import ProductStock from '../models/ProductStock.js';
import BankAccount from '../models/BankAccount.js';
import PaymentLink from '../models/PaymentLink.js';
import BatteryTradeIn from '../models/BatteryTradeIn.js';
import MemberPolicy from '../models/MemberPolicy.js';
import StockOut from '../models/StockOut.js';
import { getStockAtLocation } from './productStockController.js';
import { generateStockOutCode } from '../utils/stockOutCode.js';
import { assignDefaultRole } from '../libs/rbacHelpers.js';
import { getManagerAllowedLocationIds, validateLocationForUser } from '../libs/managerLocationHelper.js';
import { userHasEquivalentRole } from '../utils/roleEquivalence.js';
import { createPayOSPaymentLink, getPayOSPaymentStatus } from '../libs/payosHelper.js';
import { getVietQRQuickLink } from '../libs/vietqrHelper.js';
import 'dotenv/config';

const GUEST_USERNAME = '__guest_pos__';

const clampVatPercent = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.min(100, Math.max(0, x));
};

const getStoreDefaultVat = async () => {
    const s = await StoreSettings.findOne().lean();
    return clampVatPercent(s?.defaultVatPercent ?? 10);
};

const effectiveVatPercent = (product, defaultVat) => {
    if (product?.vatPercent != null && Number.isFinite(Number(product.vatPercent))) {
        return clampVatPercent(product.vatPercent);
    }
    return clampVatPercent(defaultVat);
};

/** Đơn giá chưa thuế × SL → tiền trước thuế; thuế làm tròn; thành tiền dòng = trước thuế + thuế */
const lineGrossFromExVat = (unitPriceEx, qty, vatPercent) => {
    const net = Math.round(Number(unitPriceEx) * Number(qty));
    const vat = Math.round((net * vatPercent) / 100);
    return { net, vat, gross: net + vat };
};

/** Lấy hoặc tạo User "Khách vãng lai" cho đơn bán tại quầy (khi Customer không có tài khoản) */
const getOrCreateGuestUser = async () => {
    let guest = await User.findOne({ username: GUEST_USERNAME }).lean();
    if (guest) return guest;
    const hashedPassword = await bcrypt.hash('guest_pos_' + Date.now(), 10);
    const newUser = await User.create({
        username: GUEST_USERNAME,
        password: hashedPassword,
        email: 'guest@pos.system',
        firstName: 'Khách',
        lastName: 'vãng lai',
    });
    await assignDefaultRole(newUser);
    return newUser.toObject();
};

const isAdminOrManager = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    return roleNames.some((r) => ['admin', 'manager', 'Quản lý chi nhánh'].includes(r));
};

/** Danh sách đơn cửa hàng: admin (mọi cơ sở), manager & quản lý chi nhánh (theo chi nhánh được phân). */
const canViewAllOrders = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    return roleNames.some((r) => ['admin', 'manager', 'Quản lý chi nhánh'].includes(r));
};

/** Xử lý hoàn tiền (VietQR / xác nhận) — khớp route refund-transfer-qr */
const canProcessRefundTransfer = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    return roleNames.some((r) =>
        ['admin', 'manager', 'Quản lý chi nhánh', 'seller', 'staff', 'Nhân viên bán hàng'].includes(r),
    );
};

/**
 * Sinh mã đơn hàng duy nhất.
 */
const generateOrderCode = async () => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `ORD-${Date.now().toString(36).toUpperCase()}-${suffix}`;
    const exists = await Order.exists({ code });
    if (exists) return generateOrderCode();
    return code;
};

/**
 * Hoàn tồn khi hủy đơn: đơn online đang giữ chỗ → chỉ giảm reservedOnlineQty; còn lại → cộng lại quantity.
 * Xóa phiếu xuất gắn đơn (nếu có) để báo cáo NXT không lệch với tồn đã hoàn.
 */
async function restoreInventoryOnOrderCancel(order) {
    const locationId = order.location;
    await StockOut.deleteMany({ order: order._id });
    if (
        (order.channel === 'online' || order.channel === 'in_store') &&
        order.warehouseReservationActive === true
    ) {
        for (const item of order.items) {
            await ProductStock.findOneAndUpdate(
                { product: item.product, location: locationId },
                { $inc: { reservedOnlineQty: -item.quantity } }
            );
        }
        return;
    }
    /** Đặt cọc / chờ: chưa trừ tồn thực tế — không cộng lại */
    if (order.isPreOrder === true) {
        return;
    }
    for (const item of order.items) {
        const stockRow = await ProductStock.findOne({ product: item.product, location: locationId });
        if (stockRow) {
            stockRow.quantity += item.quantity;
            await stockRow.save();
        }
    }
}

/**
 * Đơn chưa giữ chỗ (ví dụ đặt trước / bản cũ) mà đủ Đã xác nhận + Đã thanh toán → tăng reservedOnlineQty, bật warehouseReservationActive để vào hàng chờ quét xuất.
 */
async function applyWarehouseQueueReservationIfReady(order) {
    if (order.warehouseReservationActive === true) {
        return { success: true, skipped: true };
    }
    if (order.status === 'cancelled' || order.status !== 'confirmed' || order.paymentStatus !== 'paid') {
        return { success: true, skipped: true };
    }
    if (order.channel !== 'online' && order.channel !== 'in_store') {
        return { success: true, skipped: true };
    }
    if (!order.items?.length) {
        return { success: true, skipped: true };
    }
    const locationId = order.location?._id || order.location;
    for (const item of order.items) {
        const pid = item.product?._id || item.product;
        const need = Math.max(1, Number(item.quantity) || 1);
        const avail = await getStockAtLocation(pid, locationId);
        if (avail < need) {
            const product = await Product.findById(pid).lean();
            return {
                success: false,
                message: `Chưa đủ tồn để xếp hàng xuất (sản phẩm "${product?.name || '—'}" — cần ${need}, khả dụng ${avail}). Nhập thêm tồn rồi cập nhật lại đơn.`,
            };
        }
    }
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            for (const item of order.items) {
                const pid = item.product?._id || item.product;
                const qty = Math.max(1, Number(item.quantity) || 1);
                await ProductStock.findOneAndUpdate(
                    { product: pid, location: locationId },
                    { $inc: { reservedOnlineQty: qty } },
                    { session, upsert: true }
                );
            }
        });
    } catch (e) {
        return { success: false, message: e?.message || 'Không thể giữ chỗ tồn kho' };
    } finally {
        session.endSession();
    }
    order.warehouseReservationActive = true;
    return { success: true, skipped: false, activated: true };
}

/**
 * GET /api/orders/checkout-preview – Xem trước hạng khách hàng và chiết khấu khi checkout.
 * Trả về: tierName, discountPercent, discount, subtotal, finalTotal.
 */
export const checkoutPreview = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.product', 'name price isDeleted vatPercent unit');
        const defaultVatPreview = await getStoreDefaultVat();
        let sumNet = 0;
        let sumVat = 0;
        let sumGross = 0;
        if (cart?.items?.length) {
            for (const item of cart.items) {
                if (item.selected === false) continue;
                const product = item.product && typeof item.product === 'object' ? item.product : await Product.findById(item.product);
                if (product && !product.isDeleted) {
                    const qty = Number(item.quantity) || 1;
                    const price = typeof product.price === 'number' ? product.price : Number(item.priceSnapshot) || 0;
                    const r = effectiveVatPercent(product, defaultVatPreview);
                    const { net, vat, gross } = lineGrossFromExVat(price, qty, r);
                    sumNet += net;
                    sumVat += vat;
                    sumGross += gross;
                }
            }
        }
        const subtotal = sumNet;

        const customerProfile = await getOrCreateCustomerFromUser(await User.findById(userId).lean());
        const accumulatedAmount = customerProfile?.accumulatedAmount ?? 0;

        const policies = await MemberPolicy.find({ isActive: true }).sort({ minTotalSpent: 1 }).lean();
        const tierPolicy = getCustomerPolicy(accumulatedAmount, policies);
        const tierName = tierPolicy?.name ?? null;
        const discountPercent = tierPolicy?.discountPercent ?? 0;
        const discount = Math.round((sumNet * discountPercent) / 100);
        const finalTotal = Math.max(0, sumGross - discount);

        return res.status(200).json({
            success: true,
            data: {
                tierName,
                discountPercent,
                discount,
                subtotal,
                vatTotal: sumVat,
                grossSubtotal: sumGross,
                finalTotal,
                accumulatedAmount,
            },
        });
    } catch (error) {
        console.error('checkoutPreview error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy thông tin checkout',
            error: error.message,
        });
    }
};

/**
 * POST /api/orders – Tạo đơn hàng từ giỏ hàng (online, bán trên web).
 * Body: { paymentMethod, shippingAddress?, shippingPhone?, note? } hoặc { provinceCode, provinceName, districtCode, districtName, wardCode, wardName, addressLine }
 */
export const createOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            locationId,
            paymentMethod,
            recipientName = '',
            shippingAddress: shippingAddressRaw = '',
            shippingPhone = '',
            note = '',
            provinceCode = '',
            provinceName = '',
            districtCode = '',
            districtName = '',
            wardCode = '',
            wardName = '',
            addressLine = '',
        } = req.body || {};

        const hasStructured = provinceCode || provinceName || districtCode || districtName || wardCode || wardName || addressLine;
        const shippingAddress = hasStructured
            ? [String(addressLine).trim(), String(wardName).trim(), String(districtName).trim(), String(provinceName).trim()].filter(Boolean).join(', ')
            : String(shippingAddressRaw).trim();

        // Validate thông tin checkout
        const recipientNameStr = String(recipientName).trim();
        if (!recipientNameStr) {
            return res.status(400).json({ message: 'Vui lòng nhập tên người nhận' });
        }
        if (recipientNameStr.length < 2 || recipientNameStr.length > 100) {
            return res.status(400).json({ message: 'Tên người nhận phải từ 2–100 ký tự' });
        }
        if (!/^[\p{L}\s.'-]+$/u.test(recipientNameStr)) {
            return res.status(400).json({ message: 'Tên người nhận chỉ được chứa chữ cái, dấu cách hoặc dấu chấm' });
        }

        const shippingPhoneStr = String(shippingPhone).trim().replace(/\s/g, '');
        if (!shippingPhoneStr) {
            return res.status(400).json({ message: 'Vui lòng nhập số điện thoại nhận hàng' });
        }
        if (!/^0[2-9][0-9]{8,9}$/.test(shippingPhoneStr)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ (ví dụ: 0901234567)' });
        }

        if (!shippingAddress || shippingAddress.length < 10) {
            return res.status(400).json({ message: 'Địa chỉ giao hàng phải có ít nhất 10 ký tự' });
        }
        if (shippingAddress.length > 300) {
            return res.status(400).json({ message: 'Địa chỉ giao hàng không quá 300 ký tự' });
        }

        if (hasStructured && (!provinceCode || !districtCode || !wardCode)) {
            return res.status(400).json({ message: 'Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã' });
        }

        const noteStr = String(note).trim();
        if (noteStr.length > 500) {
            return res.status(400).json({ message: 'Ghi chú không quá 500 ký tự' });
        }

        // Đơn online: chỉ chấp nhận chuyển khoản (thanh toán trước)
        const validMethods = ['vietqr', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'transfer';

        // Bán online: dùng chi nhánh được đặt làm bán online, fallback chi nhánh đầu tiên
        let location;
        if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
            location = await Location.findById(locationId);
        }
        if (!location || !location.isActive) {
            location = await getOnlineLocation();
        }
        if (!location) {
            return res.status(400).json({ message: 'Hệ thống chưa có chi nhánh. Vui lòng liên hệ quản trị viên.' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.product', 'name price isDeleted vatPercent unit');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng trống' });
        }

        const selectedCartItems = cart.items.filter((item) => item.selected !== false);
        if (selectedCartItems.length === 0) {
            return res.status(400).json({
                message: 'Vui lòng chọn ít nhất một sản phẩm trong giỏ để thanh toán',
            });
        }

        const defaultVat = await getStoreDefaultVat();
        const orderItems = [];
        let sumNet = 0;
        let sumGross = 0;

        for (const item of selectedCartItems) {
            const productId = item.product?._id || item.product;
            if (!productId) continue;

            const product = item.product && typeof item.product === 'object' ? item.product : await Product.findById(productId);
            if (!product || product.isDeleted) {
                return res.status(400).json({
                    message: `Sản phẩm ${product?.name || productId} không tồn tại hoặc đã ngừng kinh doanh`,
                });
            }

            const qty = Number(item.quantity) || 1;
            const price = typeof product.price === 'number' ? product.price : Number(item.priceSnapshot) || 0;
            const stock = await getStockAtLocation(productId, location._id);

            if (stock < qty) {
                return res.status(400).json({
                    message: `Sản phẩm "${product.name}" không đủ tồn (yêu cầu: ${qty}, tồn: ${stock})`,
                });
            }

            const r = effectiveVatPercent(product, defaultVat);
            const { net, vat, gross } = lineGrossFromExVat(price, qty, r);
            const unit = (product.unit && String(product.unit).trim()) || 'Cái';
            orderItems.push({
                product: productId,
                quantity: qty,
                price,
                total: gross,
                unit,
                vatPercent: r,
                vatAmount: vat,
            });
            sumNet += net;
            sumGross += gross;
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ trong các mục đã chọn' });
        }

        const customerProfile = await getOrCreateCustomerFromUser(await User.findById(userId).lean());
        if (!customerProfile) {
            return res.status(500).json({ message: 'Không thể tạo thông tin khách hàng' });
        }
        if (customerProfile.type !== 'registered') {
            await Customer.findByIdAndUpdate(customerProfile._id, { type: 'registered', userId: userId });
        }

        // Áp dụng giảm giá theo hạng thành viên (MemberPolicy)
        const policies = await MemberPolicy.find({ isActive: true }).sort({ minTotalSpent: 1 }).lean();
        const tierPolicy = getCustomerPolicy(customerProfile.accumulatedAmount ?? 0, policies);
        const discountPercent = tierPolicy?.discountPercent ?? 0;
        const discount = Math.round((sumNet * discountPercent) / 100);
        const finalTotal = Math.max(0, sumGross - discount);

        const code = await generateOrderCode();

        const orderPayload = {
            code,
            channel: 'online',
            customer: userId,
            customerProfile: customerProfile._id,
            location: location._id,
            createdBy: null,
            items: orderItems,
            totalAmount: finalTotal,
            discount,
            status: 'pending',
            paymentMethod: method,
            paymentStatus: 'pending',
            shippingAddress,
            shippingRecipientName: recipientNameStr,
            shippingPhone: shippingPhoneStr,
            provinceCode: String(provinceCode).trim(),
            provinceName: String(provinceName).trim(),
            districtCode: String(districtCode).trim(),
            districtName: String(districtName).trim(),
            wardCode: String(wardCode).trim(),
            wardName: String(wardName).trim(),
            addressLine: String(addressLine).trim(),
            note: noteStr,
            warehouseReservationActive: true,
        };

        let order;
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const created = await Order.create([orderPayload], { session });
                order = created[0];
                for (const item of orderItems) {
                    await ProductStock.findOneAndUpdate(
                        { product: item.product, location: location._id },
                        { $inc: { reservedOnlineQty: item.quantity } },
                        { session, upsert: true }
                    );
                }
                const cartInTxn = await Cart.findOne({ userId }).session(session);
                if (cartInTxn) {
                    const orderedIds = new Set(orderItems.map((i) => i.product.toString()));
                    cartInTxn.items = cartInTxn.items.filter((line) => {
                        const pid = (line.product?._id || line.product).toString();
                        return !orderedIds.has(pid);
                    });
                    await cartInTxn.save({ session });
                }
            });
        } finally {
            session.endSession();
        }

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name address')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            data: { order: populated },
        });
    } catch (error) {
        console.error('createOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message,
        });
    }
};

/** Lấy hoặc tạo Customer "Khách vãng lai" mặc định (khi không chọn khách) */
const getOrCreateDefaultWalkinCustomer = async () => {
    let c = await Customer.findOne({ type: 'walkin' }).sort({ createdAt: 1 }).lean();
    if (c) return c;
    const newC = await Customer.create({ name: 'Khách vãng lai', phone: '', type: 'walkin' });
    return newC.toObject();
};

/**
 * Lấy policy hạng thành viên cao nhất mà khách đạt được (theo accumulatedAmount).
 * Policies nên được sắp xếp theo minTotalSpent tăng dần.
 */
const getCustomerPolicy = (accumulatedAmount, policies) => {
    if (!Array.isArray(policies) || policies.length === 0) return null;
    const amount = Number(accumulatedAmount) || 0;
    const active = policies.filter((p) => p.isActive !== false);
    let matched = null;
    for (const p of active) {
        if (amount >= (p.minTotalSpent ?? 0)) matched = p;
    }
    return matched;
};

/** Lấy hoặc tạo Customer từ User (đơn online) */
const getOrCreateCustomerFromUser = async (user) => {
    if (!user) return null;
    const fullUser = await User.findById(user._id).lean();
    if (fullUser?.customerId) {
        const c = await Customer.findById(fullUser.customerId).lean();
        if (c) return c;
    }
    const name = [fullUser?.firstName, fullUser?.lastName].filter(Boolean).join(' ') || fullUser?.username || 'Khách hàng';
    const phone = fullUser?.phoneNumber || '';
    let customer = await Customer.findOne({ userId: user._id }).lean();
    if (customer) return customer;
    if (phone) {
        customer = await Customer.findOne({ phone }).lean();
        if (customer) {
            await Customer.findByIdAndUpdate(customer._id, { userId: user._id, type: 'registered' });
            await User.findByIdAndUpdate(user._id, { customerId: customer._id });
            return customer;
        }
    }
    const newC = await Customer.create({
        name,
        phone,
        type: 'registered',
        userId: user._id,
    });
    await User.findByIdAndUpdate(user._id, { customerId: newC._id });
    return newC.toObject();
};

/**
 * POST /api/orders/from-items – Tạo đơn hàng từ danh sách sản phẩm (bán tại quầy).
 * Body: { items, locationId, paymentMethod, note?, isPreOrder?, customerId? }
 * customerId: Customer từ bảng khách hàng. Nếu không có thì dùng "Khách vãng lai".
 */
export const createOrderFromItems = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {
            items: rawItems = [],
            locationId,
            paymentMethod,
            note = '',
            discount: discountAmount = 0,
            isPreOrder = false,
            customerId,
            customerName,
            customerPhone,
            createdBy: sellerId,
        } = req.body || {};
        // createdBy (sellerId): Admin/Manager có thể chọn người bán khác

        if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh/kho' });
        }

        const validMethods = ['vietqr', 'cash', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

        const location = await Location.findById(locationId);
        if (!location || !location.isActive) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh hoặc chi nhánh không hoạt động' });
        }

        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ message: 'Danh sách sản phẩm trống' });
        }

        const defaultVat = await getStoreDefaultVat();
        const orderItems = [];
        let sumGross = 0;

        for (const it of rawItems) {
            const productId = it.productId?.toString?.() || it.productId;
            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;

            const product = await Product.findOne({ _id: productId, isDeleted: false }).lean();
            if (!product) {
                return res.status(400).json({
                    message: `Sản phẩm không tồn tại hoặc đã ngừng kinh doanh`,
                });
            }

            const qty = Math.max(1, Number(it.quantity) || 1);
            const price = typeof product.price === 'number' ? product.price : 0;
            const stock = await getStockAtLocation(productId, locationId);

            if (stock < qty) {
                return res.status(400).json({
                    message: `Sản phẩm "${product.name}" không đủ tồn (yêu cầu: ${qty}, tồn: ${stock})`,
                });
            }

            const r = effectiveVatPercent(product, defaultVat);
            const { vat, gross } = lineGrossFromExVat(price, qty, r);
            const unit = (product.unit && String(product.unit).trim()) || 'Cái';
            orderItems.push({
                product: product._id,
                quantity: qty,
                price,
                total: gross,
                unit,
                vatPercent: r,
                vatAmount: vat,
            });
            sumGross += gross;
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ' });
        }

        const discount = Math.max(0, Number(discountAmount) || 0);
        const finalTotal = Math.max(0, sumGross - discount);

        let customerProfile = null;
        let orderCustomerUserId = userId;

        if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
            customerProfile = await Customer.findById(customerId).lean();
            if (customerProfile) {
                if (customerProfile.userId) {
                    orderCustomerUserId = customerProfile.userId;
                } else {
                    const guest = await getOrCreateGuestUser();
                    orderCustomerUserId = guest._id;
                }
            }
        }
        if (!customerProfile && customerName?.trim() && customerPhone?.trim()) {
            let existing = await Customer.findOne({ phone: customerPhone.trim() }).lean();
            if (existing) {
                customerProfile = existing;
                if (customerProfile.userId) orderCustomerUserId = customerProfile.userId;
                else orderCustomerUserId = (await getOrCreateGuestUser())._id;
            } else {
                const newC = await Customer.create({
                    name: customerName.trim(),
                    phone: customerPhone.trim(),
                    type: 'retail',
                });
                customerProfile = newC.toObject();
                orderCustomerUserId = (await getOrCreateGuestUser())._id;
            }
        }
        if (!customerProfile) {
            customerProfile = await getOrCreateDefaultWalkinCustomer();
            const guest = await getOrCreateGuestUser();
            orderCustomerUserId = guest._id;
        }

        let createdByUserId = userId;
        const canSelectSeller = await isAdminOrManager(userId);
        if (canSelectSeller && sellerId && mongoose.Types.ObjectId.isValid(sellerId) && sellerId.toString() !== userId.toString()) {
            const seller = await User.findById(sellerId).populate('roles', 'name').lean();
            const sellerRoles = seller?.roles?.map((r) => r.name) || [];
            if (seller && sellerRoles.some((r) => ['seller', 'admin'].includes(r))) {
                createdByUserId = sellerId;
            }
        }

        const code = await generateOrderCode();

        const awaitingBankTransfer = !isPreOrder && (method === 'transfer' || method === 'vietqr');
        /** Bán tại quầy (không đặt trước): cùng luồng online — giữ chỗ tồn, kho xác nhận xuất. */
        const inStoreStatusNonPre = isPreOrder
            ? 'pending'
            : awaitingBankTransfer
              ? 'pending'
              : 'confirmed';
        const inStorePaymentNonPre = isPreOrder ? 'pending' : awaitingBankTransfer ? 'pending' : 'paid';
        const inStorePaidAt = isPreOrder || awaitingBankTransfer ? null : new Date();

        const orderPayload = {
            code,
            channel: 'in_store',
            customer: orderCustomerUserId,
            customerProfile: customerProfile._id,
            location: locationId,
            createdBy: createdByUserId,
            items: orderItems,
            totalAmount: finalTotal,
            discount,
            status: isPreOrder ? 'pending' : inStoreStatusNonPre,
            paymentMethod: method,
            paymentStatus: isPreOrder ? 'pending' : inStorePaymentNonPre,
            paidAt: inStorePaidAt,
            shippingAddress: 'Tại quầy',
            note: String(note).trim(),
            isPreOrder: !!isPreOrder,
            warehouseReservationActive: !isPreOrder ? true : false,
        };

        let order;
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const [created] = await Order.create([orderPayload], { session });
                order = created;
                if (!isPreOrder) {
                    for (const item of orderItems) {
                        await ProductStock.findOneAndUpdate(
                            { product: item.product, location: locationId },
                            { $inc: { reservedOnlineQty: item.quantity } },
                            { session, upsert: true }
                        );
                    }
                    if (!awaitingBankTransfer) {
                        await Customer.findByIdAndUpdate(
                            customerProfile._id,
                            { $inc: { accumulatedAmount: finalTotal } },
                            { session }
                        );
                    }
                }
            });
        } catch (e) {
            if (e?.code === 'INSUFFICIENT_STOCK') {
                return res.status(400).json({
                    message: 'Không đủ tồn kho để hoàn tất đơn',
                });
            }
            throw e;
        } finally {
            session.endSession();
        }

        if (!order?._id) {
            return res.status(500).json({ message: 'Lỗi khi tạo đơn' });
        }

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name address')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(201).json({
            success: true,
            message: 'Tạo hóa đơn thành công',
            data: { order: populated },
        });
    } catch (error) {
        console.error('createOrderFromItems error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi tạo hóa đơn',
            error: error.message,
        });
    }
};

/**
 * GET /api/orders – Danh sách đơn hàng.
 * User: chỉ đơn của mình. Admin/Manager: tất cả (có phân trang).
 */
export const getOrders = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(userId).populate('roles', 'name').lean();
        const roleNames = user?.roles?.map((r) => r.name) || [];
        const { page = 1, limit = 10, status, paymentStatus, locationId, isPreOrder, warehouseQueue } = req.query;
        const useWarehouseQueue = warehouseQueue === 'true' || warehouseQueue === '1';
        const canViewAll = roleNames.some((r) => ['admin', 'manager', 'Quản lý chi nhánh'].includes(r));

        const filter = {};
        if (!canViewAll) {
            if (useWarehouseQueue && userHasEquivalentRole(roleNames, 'warehouse_manager')) {
                /** Nhân viên kho: danh sách theo hàng chờ xuất, không lọc theo customer. */
            } else {
                const isCustomerLike = roleNames.some((r) => ['user', 'customer'].includes(r));
                if (!isCustomerLike) {
                    return res.status(403).json({ message: 'Không có quyền xem danh sách đơn hàng.' });
                }
                filter.customer = userId;
            }
        }

        const allowedLocIds = await getManagerAllowedLocationIds(userId);

        const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, Math.min(100, parseInt(limit)));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

        if (useWarehouseQueue) {
            const qBase = {
                paymentStatus: 'paid',
                warehouseReservationActive: true,
                status: 'confirmed',
            };
            const orClauses = [];
            const onlineLoc = await getOnlineLocation();
            if (onlineLoc?._id) {
                if (allowedLocIds === null || allowedLocIds.includes(String(onlineLoc._id))) {
                    orClauses.push({ ...qBase, channel: 'online', location: onlineLoc._id });
                }
            }
            if (allowedLocIds === null) {
                orClauses.push({ ...qBase, channel: 'in_store' });
            } else if (allowedLocIds.length) {
                const oidList = allowedLocIds
                    .filter((lid) => mongoose.Types.ObjectId.isValid(lid))
                    .map((lid) => new mongoose.Types.ObjectId(lid));
                orClauses.push({ ...qBase, channel: 'in_store', location: { $in: oidList } });
            }
            if (orClauses.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: {
                        orders: [],
                        pagination: {
                            page: Math.max(1, parseInt(page)),
                            limit: limitNum,
                            total: 0,
                            totalPages: 0,
                        },
                    },
                });
            }
            filter.$or = orClauses;
        } else {
            if (status) filter.status = status;
            if (paymentStatus) filter.paymentStatus = paymentStatus;
        }
        if (canViewAll && !useWarehouseQueue) {
            if (allowedLocIds !== null) {
                if (!allowedLocIds.length) {
                    return res.status(200).json({
                        success: true,
                        data: {
                            orders: [],
                            pagination: {
                                page: Math.max(1, parseInt(page)),
                                limit: limitNum,
                                total: 0,
                                totalPages: 0,
                            },
                        },
                    });
                }
                const oidList = allowedLocIds
                    .filter((lid) => mongoose.Types.ObjectId.isValid(lid))
                    .map((lid) => new mongoose.Types.ObjectId(lid));
                if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
                    if (!allowedLocIds.includes(String(locationId))) {
                        return res.status(403).json({ message: 'Không có quyền xem chi nhánh này.' });
                    }
                    filter.location = locationId;
                } else {
                    filter.location = { $in: oidList };
                }
            } else if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
                filter.location = locationId;
            }
        }
        if (isPreOrder !== undefined && isPreOrder !== '') {
            filter.isPreOrder = isPreOrder === 'true' ? true : { $ne: true };
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('items.product', 'sku name image images')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
                .populate('customerProfile', 'name phone type')
                .populate('createdBy', 'username firstName lastName')
                .lean(),
            Order.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: Math.max(1, parseInt(page)),
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('getOrders error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách đơn hàng',
            error: error.message,
        });
    }
};

/**
 * GET /api/orders/:id/generate-vietqr – Tạo mã QR VietQR cho đơn hàng (thanh toán chuyển khoản).
 * Dùng tài khoản ngân hàng mặc định của chi nhánh.
 */
export const generateVietQRForOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id).populate('location', 'name').populate('customerProfile', 'name phone').populate('items.product', 'name').lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const canViewAll = await canViewAllOrders(userId);
        if (!canViewAll && order.customer?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền tạo mã QR cho đơn này' });
        }

        const locationId = order.location?._id || order.location;
        if (!locationId) {
            return res.status(400).json({ message: 'Đơn hàng không có chi nhánh' });
        }

        const amount = order.totalAmount || 0;
        const memo = (order.code || '').replace(/[^\w-]/g, '').slice(0, 25) || 'DonHang';
        const frontendUrl = process.env.NODE_ENV === 'production' ? 'https://acquy-thanhtu.onrender.com' : process.env.FRONTEND_URL || 'http://localhost:5173';
        const returnUrl = `${frontendUrl.replace(/\/$/, '')}/orders/${id}?payment=success`;
        console.log('returnUrl', returnUrl);
        const cancelUrl = `${frontendUrl.replace(/\/$/, '')}/orders/${id}?payment=cancelled`;
        console.log('cancelUrl', cancelUrl);

        const payosItems = (order.items || []).map((i) => ({
            name: i.product?.name || 'Sản phẩm',
            quantity: Math.max(1, i.quantity || 1),
            price: Math.round(i.price || 0),
        }));
        const discount = Math.round(Number(order.discount) || 0);
        if (discount > 0) {
            payosItems.push({ name: 'Chiết khấu hạng thành viên', quantity: 1, price: -discount });
        }

        let qrDataURL = null;
        let bankAccount = null;
        let checkoutUrl = null;

        try {
            const payosResult = await createPayOSPaymentLink({
                orderId: id,
                orderCode: order.code,
                amount,
                description: memo,
                returnUrl,
                cancelUrl,
                items: payosItems,
            });
            qrDataURL = payosResult.qrDataURL;
            bankAccount = payosResult.bankAccount;
            checkoutUrl = payosResult.checkoutUrl;
            if (payosResult.orderCode != null && payosResult.paymentLinkId) {
                await PaymentLink.create({
                    order: id,
                    orderCode: payosResult.orderCode,
                    paymentLinkId: payosResult.paymentLinkId,
                    status: 'pending',
                });
            }
        } catch (payosErr) {
            console.warn('PayOS error, fallback to VietQR Quick Link:', payosErr.message);
            let acc = null;
            const bankAccountIdParam = (req.query.bankAccountId || '').trim();
            if (bankAccountIdParam && mongoose.Types.ObjectId.isValid(bankAccountIdParam)) {
                acc = await BankAccount.findOne({ _id: bankAccountIdParam, location: locationId }).lean();
            }
            if (!acc) {
                acc = await BankAccount.findOne({ location: locationId }).sort({ isDefault: -1, createdAt: 1 }).lean();
            }
            if (!acc) {
                return res.status(400).json({
                    message: 'Chưa cấu hình PayOS hoặc tài khoản ngân hàng. Vào Hồ sơ cửa hàng → Tài khoản ngân hàng.',
                });
            }
            qrDataURL = getVietQRQuickLink({
                bankCode: acc.bankCode,
                accountNumber: acc.bankAccount,
                accountName: acc.userBankName,
                amount,
                memo,
            });
            bankAccount = {
                bankCode: acc.bankCode,
                bankName: acc.bankName,
                bankAccount: acc.bankAccount,
                userBankName: acc.userBankName,
            };
        }

        return res.status(200).json({
            success: true,
            data: {
                qrDataURL,
                checkoutUrl: checkoutUrl || undefined,
                order: {
                    code: order.code,
                    totalAmount: amount,
                    customerName: order.customerProfile?.name,
                },
                bankAccount,
            },
        });
    } catch (error) {
        console.error('generateVietQRForOrder error:', error.message);
        return res.status(500).json({
            message: error.message || 'Lỗi khi tạo mã QR VietQR',
            error: error.message,
        });
    }
};

/**
 * GET /api/orders/:id/refund-transfer-qr — QR chuyển khoản tới TK khách (VietQR img, không cần API tra cứu).
 * Chỉ nhân viên cửa hàng.
 */
export const getRefundTransferQrForOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }
        const okRefund = await canProcessRefundTransfer(userId);
        if (!okRefund) {
            return res.status(403).json({ message: 'Chỉ nhân viên cửa hàng mới xem được mã QR hoàn tiền.' });
        }
        const order = await Order.findById(id).lean();
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        if (order.status !== 'cancelled' || order.paymentStatus !== 'paid') {
            return res.status(400).json({
                message: 'Chỉ tạo QR khi đơn đã hủy và đang chờ hoàn tiền (chưa đánh dấu đã hoàn).',
            });
        }
        const bin = String(order.refundBankBin || '').replace(/\D/g, '');
        const acc = String(order.refundBankAccount || '').replace(/\D/g, '');
        const holder = order.refundAccountHolder || '';
        if (!bin || bin.length < 6 || !acc || acc.length < 6) {
            return res.status(400).json({
                message:
                    'Chưa đủ dữ liệu tạo QR: cần mã BIN ngân hàng 6 số và số tài khoản. Liên hệ khách bổ sung nếu thiếu.',
            });
        }
        const memoRaw = `Hoan tien ${order.code || 'DH'}`;
        const memo = memoRaw.replace(/[^\w\s]/g, '').slice(0, 50).trim() || 'Hoan tien';
        const qrUrl = getVietQRQuickLink({
            bankCode: bin.slice(0, 6),
            accountNumber: acc,
            accountName: holder,
            amount: order.totalAmount || 0,
            memo,
        });
        return res.status(200).json({
            success: true,
            data: {
                qrUrl,
                amount: order.totalAmount || 0,
                orderCode: order.code,
                refundBankName: order.refundBankName,
                refundBankAccount: order.refundBankAccount,
                refundAccountHolder: order.refundAccountHolder,
            },
        });
    } catch (error) {
        console.error('getRefundTransferQrForOrder error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi tạo mã QR hoàn tiền', error: error.message });
    }
};

/**
 * POST /api/orders/:id/confirm-refund-transfer — Sau khi đã chuyển khoản hoàn tiền cho khách.
 */
export const confirmOrderRefundTransfer = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }
        const okRefund = await canProcessRefundTransfer(userId);
        if (!okRefund) {
            return res.status(403).json({ message: 'Bạn không có quyền xác nhận hoàn tiền.' });
        }
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        if (order.status !== 'cancelled' || order.paymentStatus !== 'paid') {
            return res.status(400).json({ message: 'Đơn không ở trạng thái chờ hoàn tiền.' });
        }
        if (!order.refundBankAccount?.trim() || !order.refundAccountHolder?.trim()) {
            return res.status(400).json({ message: 'Đơn thiếu thông tin tài khoản hoàn tiền.' });
        }
        order.paymentStatus = 'refunded';
        await order.save();
        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();
        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái hoàn tiền',
            data: { order: populated },
        });
    } catch (error) {
        console.error('confirmOrderRefundTransfer error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi xác nhận hoàn tiền', error: error.message });
    }
};

/**
 * GET /api/orders/:id/sync-payment – Đồng bộ trạng thái thanh toán từ PayOS ngay khi khách quay về.
 * Gọi PayOS API GET payment-requests/{orderCode} để lấy status, nếu PAID thì cập nhật Order ngay.
 */
export const syncPaymentFromPayOS = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const canViewAll = await canViewAllOrders(userId);
        if (!canViewAll && order.customer?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền đồng bộ đơn này' });
        }

        if (order.paymentStatus === 'paid') {
            const populated = await Order.findById(order._id)
                .populate('items.product', 'sku name')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
                .populate('customerProfile', 'name phone type')
                .populate('createdBy', 'username firstName lastName')
                .lean();
            return res.status(200).json({ success: true, data: { order: populated } });
        }

        /** Nhiều lần tạo QR → nhiều PaymentLink; luôn đồng bộ theo link mới nhất (đúng giao dịch vừa thanh toán). */
        const paymentLink = await PaymentLink.findOne({ order: id }).sort({ createdAt: -1 }).lean();
        if (!paymentLink?.orderCode) {
            const populated = await Order.findById(order._id)
                .populate('items.product', 'sku name')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
                .populate('customerProfile', 'name phone type')
                .populate('createdBy', 'username firstName lastName')
                .lean();
            return res.status(200).json({ success: true, data: { order: populated } });
        }

        const payOrderTotal = Math.max(0, Number(order.totalAmount) || 0);
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        let payosStatus = await getPayOSPaymentStatus(paymentLink.orderCode, paymentLink.paymentLinkId);
        /** PayOS đôi khi chưa kịp PAID ngay khi redirect — gọi lại vài lần. */
        for (let attempt = 0; attempt < 5; attempt++) {
            const st = payosStatus?.status || '';
            if (payosStatus && (st === 'PAID' || st === 'COMPLETED')) break;
            if (payosStatus && ['CANCELLED', 'EXPIRED', 'FAILED'].includes(st)) break;
            if (attempt >= 4) break;
            await sleep(700 * (attempt + 1));
            payosStatus = await getPayOSPaymentStatus(paymentLink.orderCode, paymentLink.paymentLinkId);
        }

        const st = payosStatus?.status || '';
        const paid = Number(payosStatus?.amountPaid) || 0;
        const remaining = payosStatus?.amountRemaining;
        const remNum = remaining === null || remaining === undefined ? null : Number(remaining);
        const isPaid =
            payosStatus &&
            (st === 'PAID' ||
                st === 'COMPLETED' ||
                (paid >= payOrderTotal && payOrderTotal > 0) ||
                (remNum === 0 && paid > 0));
        if (isPaid) {
            const paymentUpdate = { paymentStatus: 'paid', paidAt: new Date() };
            if (
                order.channel === 'in_store' &&
                order.status === 'pending' &&
                (order.warehouseReservationActive === true || order.isPreOrder === true)
            ) {
                paymentUpdate.status = 'confirmed';
            }
            await Order.findByIdAndUpdate(id, paymentUpdate);
            if (order.customerProfile) {
                await Customer.findByIdAndUpdate(order.customerProfile, {
                    $inc: { accumulatedAmount: order.totalAmount || 0 },
                });
            }
            await PaymentLink.updateOne({ _id: paymentLink._id }, { status: 'paid' });

            const orderDoc = await Order.findById(id);
            if (orderDoc) {
                const resApp = await applyWarehouseQueueReservationIfReady(orderDoc);
                if (resApp.success && resApp.activated) {
                    await orderDoc.save();
                } else if (!resApp.success) {
                    console.error('applyWarehouseQueueReservationIfReady after PayOS:', resApp.message);
                }
            }
        }

        const populated = await Order.findById(id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(200).json({ success: true, data: { order: populated } });
    } catch (error) {
        console.error('syncPaymentFromPayOS error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi đồng bộ trạng thái thanh toán',
            error: error.message,
        });
    }
};

/**
 * GET /api/orders/:id – Chi tiết đơn hàng.
 * User: chỉ xem đơn của mình. Admin/Manager: xem tất cả.
 */
export const getOrderById = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id)
            .populate('items.product', 'sku barcode name price image images')
            .populate('location', 'code name address phone')
            .populate('customer', 'username email firstName lastName phoneNumber')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const canViewAll = await canViewAllOrders(userId);

        if (!canViewAll && order.customer?._id?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này' });
        }

        if (canViewAll) {
            const allowedLocIds = await getManagerAllowedLocationIds(userId);
            if (allowedLocIds !== null) {
                const locId =
                    order.location?._id != null
                        ? String(order.location._id)
                        : String(order.location || '');
                if (!allowedLocIds.length || !allowedLocIds.includes(locId)) {
                    return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này' });
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: { order },
        });
    } catch (error) {
        console.error('getOrderById error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy chi tiết đơn hàng',
            error: error.message,
        });
    }
};

function outboundHttpError(statusCode, message) {
    const e = new Error(message);
    e.statusCode = statusCode;
    return e;
}

/**
 * Tìm đơn theo mã/ID (online hoặc tại quầy) khi kho mở để đóng gói. Phạm vi chi nhánh theo quyền user.
 */
async function findOrderByScanForWarehouse(userId, rawScan) {
    const raw = String(rawScan || '').trim();
    if (!raw) return null;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw) {
        order = await Order.findById(raw).populate('items.product', 'sku barcode name');
    }
    if (!order) {
        const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        order = await Order.findOne({ code: new RegExp(`^${esc}$`, 'i') }).populate('items.product', 'sku barcode name');
    }
    if (!order) return null;

    const { valid: locOk } = await validateLocationForUser(userId, order.location?._id || order.location);
    if (!locOk) return null;

    if (order.channel === 'online') {
        const onlineLoc = await getOnlineLocation();
        if (!onlineLoc?._id || String(order.location) !== String(onlineLoc._id)) return null;
    }
    return order;
}

/** Kiểm tra đơn đủ điều kiện đóng gói / xuất kho (chưa kiểm tra đã quét đủ dòng). */
function assertOrderReadyForWarehouseOperations(order) {
    if (order.status === 'cancelled') {
        throw outboundHttpError(400, 'Đơn đã hủy');
    }
    if (order.paymentStatus !== 'paid') {
        throw outboundHttpError(400, 'Đơn chưa thanh toán');
    }
    if (order.status !== 'confirmed') {
        throw outboundHttpError(400, 'Đơn chưa ở trạng thái chờ xuất kho (đã xác nhận).');
    }
    if (order.warehouseReservationActive !== true) {
        throw outboundHttpError(400, 'Đơn không còn ở trạng thái chờ xuất kho');
    }
}

/** Đồng bộ: đơn online phải tại chi nhánh bán online. */
async function assertWarehouseOrderContext(order) {
    if (order.channel === 'online') {
        const onlineLoc = await getOnlineLocation();
        if (!onlineLoc?._id) {
            throw outboundHttpError(400, 'Hệ thống chưa xác định được chi nhánh bán online');
        }
        if (String(order.location) !== String(onlineLoc._id)) {
            throw outboundHttpError(
                400,
                'Đơn không thuộc chi nhánh bán online đang cấu hình — không thao tác tại đây.'
            );
        }
    }
}

async function assertUserMayOperateWarehouseOnOrder(userId, order) {
    const { valid } = await validateLocationForUser(userId, order.location?._id || order.location);
    if (!valid) {
        throw outboundHttpError(403, 'Bạn không có quyền thao tác kho tại chi nhánh của đơn này');
    }
    await assertWarehouseOrderContext(order);
}

function assertWarehouseItemsPreparationDone(order) {
    if (!order.warehouseItemsPreparedAt) {
        throw outboundHttpError(400, 'Cần bấm "Xác nhận đã chuẩn bị hàng" (đã gom/kiểm sản phẩm) trước khi quét đóng gói hoặc xuất kho.');
    }
}

function getPackedLineSet(order) {
    const arr = order.warehousePackedLineIndexes || [];
    return new Set(arr.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0));
}

function packingProgressPayload(orderLean) {
    const n = orderLean.items?.length || 0;
    const packed = new Set(
        (orderLean.warehousePackedLineIndexes || []).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)
    );
    const lines = (orderLean.items || []).map((it, idx) => {
        const p = it.product;
        return {
            lineIndex: idx,
            packed: packed.has(idx),
            quantity: it.quantity,
            productName: p?.name || '—',
            sku: p?.sku || '—',
            barcode: p?.barcode || '',
        };
    });
    return {
        packedLineIndexes: [...packed].sort((a, b) => a - b),
        totalLines: n,
        packedCount: packed.size,
        allPacked: n > 0 && packed.size === n,
        lines,
        itemsPrepared: Boolean(orderLean.warehouseItemsPreparedAt),
    };
}

/**
 * POST /api/orders/warehouse/lookup-online-order — Tìm đơn theo mã/ID để đóng gói (không trừ tồn).
 */
export const lookupOnlineOrderForPacking = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { scan } = req.body || {};
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const raw = String(scan || '').trim();
        if (!raw) {
            return res.status(400).json({ message: 'Thiếu mã đơn hoặc ID đơn' });
        }
        const order = await findOrderByScanForWarehouse(userId, raw);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hoặc bạn không có quyền tại chi nhánh này' });
        }
        try {
            assertOrderReadyForWarehouseOperations(order);
            await assertUserMayOperateWarehouseOnOrder(userId, order);
        } catch (e) {
            if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
            throw e;
        }
        const dup = await StockOut.findOne({ order: order._id }).lean();
        if (dup) {
            return res.status(400).json({ message: 'Đơn đã có phiếu xuất kho' });
        }
        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku barcode name')
            .populate('location', 'code name')
            .lean();
        return res.status(200).json({
            success: true,
            data: {
                order: populated,
                ...packingProgressPayload(populated),
            },
        });
    } catch (error) {
        console.error('lookupOnlineOrderForPacking error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi tải đơn', error: error.message });
    }
};

/**
 * POST /api/orders/:id/warehouse-confirm-prepared — Kho xác nhận đã gom/kiểm hàng (bước bắt buộc trước khi quét từng dòng & xuất kho).
 */
export const confirmWarehouseItemsPrepared = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }
        const order = await Order.findById(id).populate('items.product', 'sku barcode name');
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        try {
            assertOrderReadyForWarehouseOperations(order);
            await assertUserMayOperateWarehouseOnOrder(userId, order);
        } catch (e) {
            if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
            throw e;
        }
        const dup = await StockOut.findOne({ order: order._id }).lean();
        if (dup) {
            return res.status(400).json({ message: 'Đơn đã có phiếu xuất kho' });
        }
        if (order.warehouseItemsPreparedAt) {
            const populated = await Order.findById(order._id)
                .populate('items.product', 'sku barcode name')
                .populate('location', 'code name address')
                .lean();
            return res.status(200).json({
                success: true,
                message: 'Đơn đã được xác nhận chuẩn bị từ trước',
                data: {
                    order: populated,
                    ...packingProgressPayload(populated),
                },
            });
        }
        order.warehouseItemsPreparedAt = new Date();
        await order.save();
        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku barcode name')
            .populate('location', 'code name address')
            .lean();
        return res.status(200).json({
            success: true,
            message: 'Đã xác nhận chuẩn bị hàng — có thể quét từng dòng rồi xuất kho',
            data: {
                order: populated,
                ...packingProgressPayload(populated),
            },
        });
    } catch (error) {
        console.error('confirmWarehouseItemsPrepared error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

/**
 * POST /api/orders/:id/warehouse-pack-line — Quét SKU/mã vạch để xác nhận đóng gói một dòng hàng.
 */
export const packWarehouseOrderLine = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { scannedSku } = req.body || {};
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }
        const needle = String(scannedSku || '').trim().toLowerCase();
        if (!needle) {
            return res.status(400).json({ message: 'Thiếu mã SKU / mã vạch vừa quét' });
        }
        const order = await Order.findById(id).populate('items.product', 'sku barcode name');
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        try {
            assertOrderReadyForWarehouseOperations(order);
            await assertUserMayOperateWarehouseOnOrder(userId, order);
            assertWarehouseItemsPreparationDone(order);
        } catch (e) {
            if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
            throw e;
        }
        const dup = await StockOut.findOne({ order: order._id }).lean();
        if (dup) {
            return res.status(400).json({ message: 'Đơn đã có phiếu xuất kho' });
        }
        const packed = getPackedLineSet(order);
        const items = order.items || [];
        let pickedIdx = -1;
        for (let i = 0; i < items.length; i++) {
            if (packed.has(i)) continue;
            const p = items[i].product;
            const sku = (p?.sku && String(p.sku).toLowerCase()) || '';
            const bc = (p?.barcode && String(p.barcode).toLowerCase()) || '';
            if (sku === needle || bc === needle) {
                pickedIdx = i;
                break;
            }
        }
        if (pickedIdx < 0) {
            return res.status(400).json({
                message:
                    'Mã quét không khớp dòng hàng chưa đóng gói nào trong đơn (hoặc dòng này đã được quét trước đó).',
            });
        }
        if (!order.warehousePackedLineIndexes) order.warehousePackedLineIndexes = [];
        if (!order.warehousePackedLineIndexes.includes(pickedIdx)) {
            order.warehousePackedLineIndexes.push(pickedIdx);
            order.warehousePackedLineIndexes.sort((a, b) => a - b);
        }
        await order.save();
        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku barcode name')
            .populate('location', 'code name')
            .lean();
        return res.status(200).json({
            success: true,
            message: `Đã xác nhận đóng gói dòng ${pickedIdx + 1}/${items.length}`,
            data: {
                order: populated,
                ...packingProgressPayload(populated),
            },
        });
    } catch (error) {
        console.error('packWarehouseOrderLine error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi cập nhật đóng gói', error: error.message });
    }
};

/**
 * Trừ tồn, tạo phiếu xuất, đặt đơn completed.
 * Luôn đọc lại đơn từ DB để có warehousePackedLineIndexes mới nhất.
 */
async function executeWarehouseOutbound(orderRef, userId) {
    const o = await Order.findById(orderRef._id).populate('items.product', 'sku barcode name');
    if (!o) {
        throw outboundHttpError(404, 'Không tìm thấy đơn hàng');
    }
    assertOrderReadyForWarehouseOperations(o);
    await assertUserMayOperateWarehouseOnOrder(userId, o);
    assertWarehouseItemsPreparationDone(o);

    const dup = await StockOut.findOne({ order: o._id }).lean();
    if (dup) {
        throw outboundHttpError(400, 'Đơn đã có phiếu xuất kho');
    }

    const n = o.items?.length || 0;
    if (n === 0) {
        throw outboundHttpError(400, 'Đơn không có dòng hàng');
    }
    const packed = getPackedLineSet(o);
    for (let i = 0; i < n; i++) {
        if (!packed.has(i)) {
            throw outboundHttpError(
                400,
                'Chưa quét đủ sản phẩm đóng gói — vui lòng quét SKU/mã vạch từng dòng hàng trước khi xác nhận xuất kho.'
            );
        }
    }

    const locationId = o.location;
    const session = await mongoose.startSession();
    let stockOutDoc;
    try {
        await session.withTransaction(async () => {
            for (const item of o.items) {
                const pid = item.product?._id || item.product;
                const resUpd = await ProductStock.findOneAndUpdate(
                    {
                        product: pid,
                        location: locationId,
                        quantity: { $gte: item.quantity },
                        reservedOnlineQty: { $gte: item.quantity },
                    },
                    { $inc: { quantity: -item.quantity, reservedOnlineQty: -item.quantity } },
                    { session, new: true }
                );
                if (!resUpd) {
                    const err = new Error('INSUFFICIENT_STOCK');
                    err.code = 'INSUFFICIENT_STOCK';
                    throw err;
                }
            }

            const processedItems = o.items.map((it) => {
                const pid = it.product?._id || it.product;
                return {
                    product: pid,
                    quantity: it.quantity,
                    unitPrice: it.price,
                    totalPrice: it.total,
                };
            });
            const totalAmount = processedItems.reduce((s, it) => s + it.totalPrice, 0);
            const code = await generateStockOutCode();
            const isOnline = o.channel === 'online';
            const soNote = isOnline
                ? `Bán online — đơn ${o.code} (xuất kho sau khi nhân viên kho xác nhận)`
                : `Bán tại quầy — đơn ${o.code} (xuất kho sau khi nhân viên kho xác nhận)`;

            const [so] = await StockOut.create(
                [
                    {
                        code,
                        location: locationId,
                        createdBy: userId,
                        note: soNote,
                        status: 'confirmed',
                        confirmedAt: new Date(),
                        reasonType: 'sale_order',
                        saleChannel: isOnline ? 'online' : 'offline',
                        order: o._id,
                        items: processedItems,
                        totalAmount,
                    },
                ],
                { session }
            );
            stockOutDoc = so;

            await Order.updateOne(
                { _id: o._id },
                {
                    $set: {
                        warehouseReservationActive: false,
                        status: 'completed',
                        warehousePackedLineIndexes: [],
                        warehouseItemsPreparedAt: null,
                    },
                },
                { session }
            );
        });
    } catch (e) {
        if (e?.code === 'INSUFFICIENT_STOCK') {
            throw outboundHttpError(
                400,
                'Không đủ tồn kho thực tế hoặc số giữ chỗ không khớp — không thể xác nhận xuất kho.'
            );
        }
        throw e;
    } finally {
        session.endSession();
    }

    const populated = await Order.findById(o._id)
        .populate('items.product', 'sku barcode name')
        .populate('location', 'code name address')
        .populate('customer', 'username email firstName lastName')
        .populate('customerProfile', 'name phone type')
        .populate('createdBy', 'username firstName lastName')
        .lean();

    return { order: populated, stockOutId: stockOutDoc?._id };
}

/**
 * POST /api/orders/:id/confirm-warehouse-outbound — Trừ tồn thật, giảm giữ chỗ, tạo phiếu xuất (online & tại quầy).
 * Yêu cầu đã quét đủ từng dòng hàng đóng gói (warehousePackedLineIndexes).
 */
export const confirmWarehouseOutbound = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id).populate('items.product', 'sku barcode name');
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        try {
            const data = await executeWarehouseOutbound(order, userId);
            return res.status(200).json({
                success: true,
                message: 'Đã xác nhận xuất kho và trừ tồn',
                data,
            });
        } catch (e) {
            if (e.statusCode) {
                return res.status(e.statusCode).json({ message: e.message });
            }
            throw e;
        }
    } catch (error) {
        console.error('confirmWarehouseOutbound error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi xác nhận xuất kho',
            error: error.message,
        });
    }
};

/**
 * GET /api/orders/report – Báo cáo đơn hàng đã xác nhận và thanh toán thành công.
 * Chỉ Admin/Manager. Query: dateFrom, dateTo, page, limit, locationId.
 * Manager: chỉ được xem chi nhánh được phân công.
 */
export const getOrderReport = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const canViewAll = await isAdminOrManager(userId);
        if (!canViewAll) {
            return res.status(403).json({ message: 'Bạn không có quyền xem báo cáo đơn hàng' });
        }

        const { dateFrom, dateTo, page = 1, limit = 20, locationId } = req.query;

        /** Giống dashboard: 'all' / rỗng = không lọc theo chi nhánh (admin). */
        let effectiveLocationId = String(locationId || '').trim();
        if (effectiveLocationId === 'all') effectiveLocationId = '';

        const allowedIds = await getManagerAllowedLocationIds(userId);
        if (allowedIds !== null) {
            if (allowedIds.length === 0) {
                return res.status(403).json({
                    message: 'Bạn chưa được phân công chi nhánh. Vui lòng liên hệ quản trị viên.',
                });
            }
            if (!effectiveLocationId) {
                effectiveLocationId = allowedIds[0];
            } else if (!allowedIds.includes(effectiveLocationId.toString())) {
                return res.status(403).json({
                    message: 'Bạn không có quyền xem báo cáo chi nhánh này. Chỉ được xem chi nhánh được phân công.',
                });
            }
        }

        const filter = {
            paymentStatus: 'paid',
        };
        /** Aggregate không cast schema như find/count — bắt buộc ObjectId để $match khớp field location. */
        if (effectiveLocationId && mongoose.Types.ObjectId.isValid(effectiveLocationId)) {
            filter.location = new mongoose.Types.ObjectId(effectiveLocationId);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) filter.createdAt = { ...filter.createdAt, $gte: from };
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (!isNaN(to.getTime())) filter.createdAt = { ...filter.createdAt, $lte: to };
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const batteryFilter = {
            status: 'completed',
            completedAmount: { $gt: 0 },
        };
        if (effectiveLocationId && mongoose.Types.ObjectId.isValid(effectiveLocationId)) {
            batteryFilter.locationId = new mongoose.Types.ObjectId(effectiveLocationId);
        }
        const batteryDate = {};
        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) batteryDate.$gte = from;
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (!isNaN(to.getTime())) batteryDate.$lte = to;
        }
        if (Object.keys(batteryDate).length > 0) {
            batteryFilter.completedAt = batteryDate;
        }

        const batteryColl = BatteryTradeIn.collection.name;

        const [orderCount, batteryCount, revenueAgg, batteryAgg, idRows] = await Promise.all([
            Order.countDocuments(filter),
            BatteryTradeIn.countDocuments(batteryFilter),
            Order.aggregate([{ $match: filter }, { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
            BatteryTradeIn.aggregate([
                { $match: batteryFilter },
                { $group: { _id: null, totalExpense: { $sum: '$completedAmount' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: filter },
                { $addFields: { type: 'order', sortAt: '$createdAt' } },
                { $project: { _id: 1, type: 1, sortAt: 1 } },
                {
                    $unionWith: {
                        coll: batteryColl,
                        pipeline: [
                            { $match: batteryFilter },
                            {
                                $addFields: {
                                    type: 'battery_trade_in',
                                    sortAt: { $ifNull: ['$completedAt', '$createdAt'] },
                                },
                            },
                            { $project: { _id: 1, type: 1, sortAt: 1 } },
                        ],
                    },
                },
                { $sort: { sortAt: -1 } },
                { $skip: skip },
                { $limit: limitNum },
            ]),
        ]);

        const orderSummary = revenueAgg[0] || { totalRevenue: 0, count: 0 };
        const batterySummary = batteryAgg[0] || { totalExpense: 0, count: 0 };
        const tradeInExpense = batterySummary.totalExpense ?? 0;
        const grossSales = orderSummary.totalRevenue ?? 0;
        const netSales = grossSales - tradeInExpense;

        const orderIds = idRows.filter((r) => r.type === 'order').map((r) => r._id);
        const batteryIds = idRows.filter((r) => r.type === 'battery_trade_in').map((r) => r._id);

        const [orderDocs, batteryDocs] = await Promise.all([
            orderIds.length
                ? Order.find({ _id: { $in: orderIds } })
                      .populate('items.product', 'sku name')
                      .populate('location', 'code name')
                      .populate('customer', 'username email firstName lastName')
                      .lean()
                : [],
            batteryIds.length
                ? BatteryTradeIn.find({ _id: { $in: batteryIds } })
                      .populate('locationId', 'code name')
                      .lean()
                : [],
        ]);

        const orderMap = Object.fromEntries(orderDocs.map((o) => [o._id.toString(), o]));
        const batteryMap = Object.fromEntries(batteryDocs.map((b) => [b._id.toString(), b]));

        const items = idRows
            .map((row) => {
                if (row.type === 'order') {
                    const o = orderMap[row._id.toString()];
                    return o ? { type: 'order', ...o } : null;
                }
                const b = batteryMap[row._id.toString()];
                return b ? { type: 'battery_trade_in', ...b } : null;
            })
            .filter(Boolean);

        const totalRows = orderCount + batteryCount;

        return res.status(200).json({
            success: true,
            data: {
                items,
                summary: {
                    totalRevenue: netSales,
                    grossSales,
                    tradeInExpense,
                    netSales,
                    totalOrders: orderSummary.count,
                    revenueOrders: grossSales,
                    revenueBatteryTradeIn: tradeInExpense,
                    batteryTradeInCount: batterySummary.count ?? 0,
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalRows,
                    totalPages: Math.max(1, Math.ceil(totalRows / limitNum)),
                },
            },
        });
    } catch (error) {
        console.error('getOrderReport error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy báo cáo đơn hàng',
            error: error.message,
        });
    }
};

/**
 * POST /api/orders/:id/cancel – Khách hàng hủy đơn của mình.
 * Được hủy khi: status = pending (chờ xử lý).
 * Khi đã thanh toán: refundBankName, refundBankAccount, refundAccountHolder (bắt buộc);
 * refundBankBin (6 số, tùy chọn — để tạo mã QR hoàn tiền cho cửa hàng).
 * Hoàn lại tồn kho khi hủy.
 */
export const cancelOrderByCustomer = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { refundBankBin, refundBankName, refundBankAccount, refundAccountHolder } = req.body || {};

        if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        if (order.customer?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy đơn này' });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Đơn hàng đã bị hủy trước đó' });
        }

        const cancellableStatuses = ['pending'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({ message: 'Đơn hàng không thể hủy ở trạng thái hiện tại' });
        }

        if (order.paymentStatus === 'paid') {
            const bankName = String(refundBankName || '').trim();
            const bankAccount = String(refundBankAccount || '').replace(/\s/g, '').trim();
            const accountHolder = String(refundAccountHolder || '').trim();
            const binDigits = String(refundBankBin || '').replace(/\D/g, '');
            const bankBin = binDigits.length >= 6 ? binDigits.slice(0, 6) : '';
            if (!bankName || !bankAccount || !accountHolder) {
                return res.status(400).json({
                    message:
                        'Đơn đã thanh toán. Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản nhận hoàn tiền.',
                });
            }
            order.refundBankName = bankName;
            order.refundBankBin = bankBin;
            order.refundBankAccount = bankAccount;
            order.refundAccountHolder = accountHolder;
        }

        order.status = 'cancelled';
        await order.save();

        if (order.paymentStatus === 'paid' && order.customerProfile) {
            await Customer.findByIdAndUpdate(order.customerProfile, {
                $inc: { accumulatedAmount: -(order.totalAmount || 0) },
            });
        }

        await restoreInventoryOnOrderCancel(order);
        if (order.channel === 'online' || order.channel === 'in_store') {
            await Order.findByIdAndUpdate(order._id, { warehouseReservationActive: false });
        }

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Đã hủy đơn hàng',
            data: { order: populated },
        });
    } catch (error) {
        console.error('cancelOrderByCustomer error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message,
        });
    }
};

/**
 * PATCH /api/orders/:id – Khách hàng chỉnh sửa đơn (địa chỉ, số điện thoại, ghi chú).
 * Chỉ được sửa khi chưa thanh toán và đơn chưa hủy.
 * Body: shippingAddress?, shippingPhone?, note? hoặc provinceCode, provinceName, districtCode, districtName, wardCode, wardName, addressLine
 */
export const updateOrderByCustomer = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const {
            shippingAddress: shippingAddressRaw,
            shippingPhone,
            note,
            provinceCode,
            provinceName,
            districtCode,
            districtName,
            wardCode,
            wardName,
            addressLine,
            recipientName,
            shippingRecipientName,
        } = req.body || {};

        if (!userId || !mongoose.Types.ObjectId.isValid(userId) || !id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        if (order.customer?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa đơn này' });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Không thể sửa đơn đã hủy' });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Không thể sửa đơn đã thanh toán' });
        }

        const hasStructured =
            provinceCode !== undefined ||
            provinceName !== undefined ||
            districtCode !== undefined ||
            districtName !== undefined ||
            wardCode !== undefined ||
            wardName !== undefined ||
            addressLine !== undefined;
        if (hasStructured) {
            order.provinceCode = String(provinceCode ?? order.provinceCode ?? '').trim();
            order.provinceName = String(provinceName ?? order.provinceName ?? '').trim();
            order.districtCode = String(districtCode ?? order.districtCode ?? '').trim();
            order.districtName = String(districtName ?? order.districtName ?? '').trim();
            order.wardCode = String(wardCode ?? order.wardCode ?? '').trim();
            order.wardName = String(wardName ?? order.wardName ?? '').trim();
            order.addressLine = String(addressLine ?? order.addressLine ?? '').trim();
            order.shippingAddress = [order.addressLine, order.wardName, order.districtName, order.provinceName].filter(Boolean).join(', ');
        } else if (shippingAddressRaw !== undefined) {
            order.shippingAddress = String(shippingAddressRaw).trim();
        }
        if (shippingPhone !== undefined) order.shippingPhone = String(shippingPhone).trim();
        if (note !== undefined) order.note = String(note).trim();
        const nameRaw = recipientName !== undefined ? recipientName : shippingRecipientName;
        if (nameRaw !== undefined) {
            order.shippingRecipientName = String(nameRaw).trim();
        }
        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật đơn hàng thành công',
            data: { order: populated },
        });
    } catch (error) {
        console.error('updateOrderByCustomer error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật đơn hàng',
            error: error.message,
        });
    }
};

/**
 * PUT /api/orders/:id – Cập nhật đơn hàng (status, paymentStatus).
 * Admin / Manager / Seller. Body: { status?, paymentStatus? }
 * Đơn online: thanh toán xong vẫn "Chờ xử lý"; seller chuyển "Đã xác nhận" mới vào hàng chờ xuất kho.
 */
export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body || {};

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const previousStatus = order.status;

        if (status) {
            const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
            if (validStatuses.includes(status)) order.status = status;
        }
        if (paymentStatus) {
            const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
            const wasPaid = order.paymentStatus === 'paid';
            if (validPaymentStatuses.includes(paymentStatus)) order.paymentStatus = paymentStatus;
            if (paymentStatus === 'paid') {
                order.paidAt = new Date();
                if (!wasPaid && order.customerProfile) {
                    await Customer.findByIdAndUpdate(order.customerProfile, {
                        $inc: { accumulatedAmount: order.totalAmount || 0 },
                    });
                }
            }
        }

        if (
            order.channel === 'in_store' &&
            order.paymentStatus === 'paid' &&
            order.status === 'pending' &&
            (order.warehouseReservationActive === true || order.isPreOrder === true)
        ) {
            order.status = 'confirmed';
        }

        if (order.status === 'confirmed' && order.paymentStatus !== 'paid' && (order.channel === 'online' || order.channel === 'in_store')) {
            return res.status(400).json({
                message: 'Chỉ chuyển sang "Đã xác nhận (chờ xuất kho)" sau khi đã thanh toán.',
            });
        }

        let reservationWarning = null;
        if (
            order.status !== 'cancelled' &&
            order.status === 'confirmed' &&
            order.paymentStatus === 'paid' &&
            (order.channel === 'online' || order.channel === 'in_store') &&
            order.warehouseReservationActive !== true
        ) {
            const resApply = await applyWarehouseQueueReservationIfReady(order);
            if (!resApply.success) {
                reservationWarning =
                    resApply.message ||
                    'Chưa giữ được chỗ tồn — trạng thái vẫn cập nhật; nhập đủ tồn tại kho rồi bấm cập nhật lại để đưa đơn vào hàng chờ kho.';
            }
        }

        // Khi hủy đơn: hoàn lại tồn kho (chỉ khi đơn chưa từng bị hủy trước đó)
        if (order.status === 'cancelled' && previousStatus !== 'cancelled') {
            await restoreInventoryOnOrderCancel(order);
            if (order.channel === 'online' || order.channel === 'in_store') {
                order.warehouseReservationActive = false;
            }
        }

        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(200).json({
            success: true,
            message: reservationWarning
                ? 'Đã cập nhật đơn. Lưu ý: thông báo về tồn (reservation) — xem reservationWarning.'
                : 'Cập nhật đơn hàng thành công',
            data: { order: populated, reservationWarning },
        });
    } catch (error) {
        console.error('updateOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật đơn hàng',
            error: error.message,
        });
    }
};

/**
 * PUT /api/orders/:id/pre-order – Chỉnh sửa đơn đặt trước (chỉ khi chưa thanh toán, trạng thái chờ xử lý).
 * Body: { items, note?, locationId?, discount?, customerId? } — gửi customerId để đổi khách (có thể gửi null = khách vãng lai).
 * Không chặn tồn khi tính lại dòng (nghiệp vụ “đặt hàng trước khi đủ hàng trong kho” khi sửa).
 */
export const updatePreOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body || {};
        const { items: rawItems, note, locationId } = body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        if (order.isPreOrder !== true) {
            return res.status(400).json({ message: 'Chỉ áp dụng cho đơn đặt hàng (đặt trước) tại quầy' });
        }
        if (order.status !== 'pending' || order.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Chỉ chỉnh sửa khi đơn đang chờ xử lý và chưa thanh toán' });
        }

        const hasStockOut = await StockOut.exists({ order: order._id });
        if (hasStockOut) {
            return res.status(400).json({ message: 'Đơn đã có phiếu xuất kho — không chỉnh sửa ở đây' });
        }

        const { valid: canUseOrderLocation } = await validateLocationForUser(userId, order.location);
        if (!canUseOrderLocation) {
            return res.status(403).json({ message: 'Bạn không có quyền thao tác đơn tại chi nhánh này' });
        }

        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ message: 'Danh sách sản phẩm trống' });
        }

        let targetLocationId = order.location;
        if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
            if (String(locationId) !== String(order.location)) {
                const { valid: locOk } = await validateLocationForUser(userId, locationId);
                if (!locOk) {
                    return res.status(403).json({ message: 'Bạn không có quyền chuyển đơn sang chi nhánh này' });
                }
                const location = await Location.findById(locationId);
                if (!location || !location.isActive) {
                    return res.status(404).json({ message: 'Không tìm thấy chi nhánh hoặc chi nhánh không hoạt động' });
                }
            }
            targetLocationId = locationId;
        }

        const defaultVat = await getStoreDefaultVat();
        const orderItems = [];
        let sumGross = 0;
        for (const it of rawItems) {
            const productId = it.productId?.toString?.() || it.productId;
            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;
            const product = await Product.findOne({ _id: productId, isDeleted: false }).lean();
            if (!product) {
                return res.status(400).json({ message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh' });
            }
            const qty = Math.max(1, Number(it.quantity) || 1);
            const price = typeof product.price === 'number' ? product.price : 0;
            const r = effectiveVatPercent(product, defaultVat);
            const { vat, gross } = lineGrossFromExVat(price, qty, r);
            const unit = (product.unit && String(product.unit).trim()) || 'Cái';
            orderItems.push({
                product: product._id,
                quantity: qty,
                price,
                total: gross,
                unit,
                vatPercent: r,
                vatAmount: vat,
            });
            sumGross += gross;
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ' });
        }

        const discount = Object.prototype.hasOwnProperty.call(body, 'discount')
            ? Math.max(0, Number(body.discount) || 0)
            : (order.discount != null ? Number(order.discount) : 0);
        const finalTotal = Math.max(0, sumGross - discount);

        if (Object.prototype.hasOwnProperty.call(body, 'customerId')) {
            const cid = body.customerId;
            let customerProfile = null;
            let orderCustomerUserId = order.customer;
            if (cid && mongoose.Types.ObjectId.isValid(String(cid))) {
                const found = await Customer.findById(cid).lean();
                if (found) {
                    customerProfile = found;
                    if (found.userId) {
                        orderCustomerUserId = found.userId;
                    } else {
                        orderCustomerUserId = (await getOrCreateGuestUser())._id;
                    }
                }
            }
            if (!customerProfile) {
                customerProfile = await getOrCreateDefaultWalkinCustomer();
                orderCustomerUserId = (await getOrCreateGuestUser())._id;
            }
            order.customer = orderCustomerUserId;
            order.customerProfile = customerProfile._id;
        }

        order.items = orderItems;
        order.totalAmount = finalTotal;
        order.discount = discount;
        order.location = targetLocationId;
        if (note !== undefined) {
            order.note = String(note || '').trim();
        }

        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku barcode name price image images')
            .populate('location', 'code name address')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .populate('createdBy', 'username firstName lastName')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật đơn đặt hàng',
            data: { order: populated },
        });
    } catch (error) {
        console.error('updatePreOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật đơn đặt hàng',
            error: error.message,
        });
    }
};

/**
 * DELETE /api/orders/:id/pre-order – Xóa đơn đặt trước (soft-không dùng: xóa bản ghi thật).
 * Không cho xóa nếu đã hoàn thành; không cho nếu đã có StockOut. Hoàn tồn / hủy giữ chỗ tương ứng.
 * Khi đã thanh toán (trừ tích lũy khi hủy) — không trừ tích lũy nếu đơn đã ở trạng thái đã hủy (đã trừ khi hủy).
 */
export const deletePreOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID đơn hàng không hợp lệ' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        if (order.isPreOrder !== true) {
            return res.status(400).json({ message: 'Chỉ xóa được đơn đặt hàng (đặt trước) qua thao tác này' });
        }
        if (order.status === 'completed') {
            return res.status(400).json({ message: 'Không xóa đơn đã hoàn thành' });
        }
        if (await StockOut.exists({ order: order._id })) {
            return res.status(400).json({
                message: 'Đơn đã có phiếu xuất kho — không xóa trực tiếp; dùng hủy/hoàn kho theo quy trình',
            });
        }

        const { valid } = await validateLocationForUser(userId, order.location);
        if (!valid) {
            return res.status(403).json({ message: 'Bạn không có quyền thao tác đơn tại chi nhánh này' });
        }

        if (
            order.paymentStatus === 'paid' &&
            order.customerProfile &&
            order.status !== 'cancelled'
        ) {
            await Customer.findByIdAndUpdate(order.customerProfile, {
                $inc: { accumulatedAmount: -(order.totalAmount || 0) },
            });
        }
        if (order.status !== 'cancelled') {
            await restoreInventoryOnOrderCancel(order);
        }
        await Order.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Đã xóa đơn đặt hàng' });
    } catch (error) {
        console.error('deletePreOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi xóa đơn đặt hàng',
            error: error.message,
        });
    }
};
