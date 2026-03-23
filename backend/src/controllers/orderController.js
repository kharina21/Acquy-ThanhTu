import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import { getOnlineLocation } from './locationController.js';
import ProductStock from '../models/ProductStock.js';
import BankAccount from '../models/BankAccount.js';
import PaymentLink from '../models/PaymentLink.js';
import MemberPolicy from '../models/MemberPolicy.js';
import { getStockAtLocation } from './productStockController.js';
import { assignDefaultRole } from '../libs/rbacHelpers.js';
import { getManagerAllowedLocationIds } from '../libs/managerLocationHelper.js';
import { createPayOSPaymentLink, getPayOSPaymentStatus } from '../libs/payosHelper.js';
import { getVietQRQuickLink } from '../libs/vietqrHelper.js';

const GUEST_USERNAME = '__guest_pos__';

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
    return roleNames.some((r) => ['admin', 'manager'].includes(r));
};

/** Cửa hàng: admin, manager, seller có thể xem tất cả đơn */
const canViewAllOrders = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    return roleNames.some((r) => ['admin', 'manager', 'seller'].includes(r));
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
 * GET /api/orders/checkout-preview – Xem trước hạng khách hàng và chiết khấu khi checkout.
 * Trả về: tierName, discountPercent, discount, subtotal, finalTotal.
 */
export const checkoutPreview = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.product', 'name price isDeleted');
        let subtotal = 0;
        if (cart?.items?.length) {
            for (const item of cart.items) {
                const product = item.product && typeof item.product === 'object' ? item.product : await Product.findById(item.product);
                if (product && !product.isDeleted) {
                    const qty = Number(item.quantity) || 1;
                    const price = typeof product.price === 'number' ? product.price : Number(item.priceSnapshot) || 0;
                    subtotal += price * qty;
                }
            }
        }

        const customerProfile = await getOrCreateCustomerFromUser(await User.findById(userId).lean());
        const accumulatedAmount = customerProfile?.accumulatedAmount ?? 0;

        const policies = await MemberPolicy.find({ isActive: true }).sort({ minTotalSpent: 1 }).lean();
        const tierPolicy = getCustomerPolicy(accumulatedAmount, policies);
        const tierName = tierPolicy?.name ?? null;
        const discountPercent = tierPolicy?.discountPercent ?? 0;
        const discount = Math.round((subtotal * discountPercent) / 100);
        const finalTotal = Math.max(0, subtotal - discount);

        return res.status(200).json({
            success: true,
            data: {
                tierName,
                discountPercent,
                discount,
                subtotal,
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

        const cart = await Cart.findOne({ userId }).populate('items.product', 'name price isDeleted');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng trống' });
        }

        const orderItems = [];
        let totalAmount = 0;

        for (const item of cart.items) {
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

            const total = price * qty;
            orderItems.push({
                product: productId,
                quantity: qty,
                price,
                total,
            });
            totalAmount += total;
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ trong giỏ hàng' });
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
        const discount = Math.round((totalAmount * discountPercent) / 100);
        const finalTotal = Math.max(0, totalAmount - discount);

        const code = await generateOrderCode();

        const order = await Order.create({
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
        });

        for (const item of orderItems) {
            const stock = await ProductStock.findOne({ product: item.product, location: location._id });
            if (stock) {
                stock.quantity -= item.quantity;
                await stock.save();
            }
        }

        cart.items = [];
        await cart.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name address')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
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

        const orderItems = [];
        let totalAmount = 0;

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

            const total = price * qty;
            orderItems.push({
                product: product._id,
                quantity: qty,
                price,
                total,
            });
            totalAmount += total;
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ' });
        }

        const discount = Math.max(0, Number(discountAmount) || 0);
        const finalTotal = Math.max(0, totalAmount - discount);

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
            if (seller && sellerRoles.includes('seller')) {
                createdByUserId = sellerId;
            }
        }

        const code = await generateOrderCode();

        const order = await Order.create({
            code,
            channel: 'in_store',
            customer: orderCustomerUserId,
            customerProfile: customerProfile._id,
            location: locationId,
            createdBy: createdByUserId,
            items: orderItems,
            totalAmount: finalTotal,
            discount,
            status: isPreOrder ? 'pending' : 'completed',
            paymentMethod: method,
            paymentStatus: isPreOrder ? 'pending' : 'paid',
            paidAt: isPreOrder ? null : new Date(),
            shippingAddress: 'Tại quầy',
            note: String(note).trim(),
            isPreOrder: !!isPreOrder,
        });

        if (!isPreOrder) {
            for (const item of orderItems) {
                const stock = await ProductStock.findOne({ product: item.product, location: locationId });
                if (stock) {
                    stock.quantity -= item.quantity;
                    await stock.save();
                }
            }
            await Customer.findByIdAndUpdate(customerProfile._id, {
                $inc: { accumulatedAmount: finalTotal },
            });
        }

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name address')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
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

        const canViewAll = await canViewAllOrders(userId);

        const filter = {};
        if (!canViewAll) {
            filter.customer = userId;
        }

        const { page = 1, limit = 10, status, paymentStatus, locationId, isPreOrder } = req.query;
        const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, Math.min(100, parseInt(limit)));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (canViewAll && locationId && mongoose.Types.ObjectId.isValid(locationId)) {
            filter.location = locationId;
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
        const frontendUrl = import.meta.env.NODE_ENV === 'production' ? 'https://acquy-thanhtu.onrender.com' : process.env.FRONTEND_URL || 'http://localhost:5173';
        const returnUrl = `${frontendUrl.replace(/\/$/, '')}/orders/${id}?payment=success`;
        const cancelUrl = `${frontendUrl.replace(/\/$/, '')}/orders/${id}?payment=cancelled`;

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
            const acc = await BankAccount.findOne({ location: locationId }).sort({ isDefault: -1, createdAt: 1 }).lean();
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
                .lean();
            return res.status(200).json({ success: true, data: { order: populated } });
        }

        const paymentLink = await PaymentLink.findOne({ order: id }).lean();
        if (!paymentLink?.orderCode) {
            const populated = await Order.findById(order._id)
                .populate('items.product', 'sku name')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
                .populate('customerProfile', 'name phone type')
                .lean();
            return res.status(200).json({ success: true, data: { order: populated } });
        }

        const payosStatus = await getPayOSPaymentStatus(paymentLink.orderCode);
        const isPaid = payosStatus && (payosStatus.status === 'PAID' || payosStatus.status === 'COMPLETED');
        if (isPaid) {
            await Order.findByIdAndUpdate(id, {
                paymentStatus: 'paid',
                paidAt: new Date(),
            });
            if (order.customerProfile) {
                await Customer.findByIdAndUpdate(order.customerProfile, {
                    $inc: { accumulatedAmount: order.totalAmount || 0 },
                });
            }
            await PaymentLink.updateOne({ _id: paymentLink._id }, { status: 'paid' });
        }

        const populated = await Order.findById(id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
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
            .populate('items.product', 'sku name price image images')
            .populate('location', 'code name address phone')
            .populate('customer', 'username email firstName lastName phoneNumber')
            .populate('customerProfile', 'name phone type')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const canViewAll = await canViewAllOrders(userId);

        if (!canViewAll && order.customer?._id?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này' });
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

        let effectiveLocationId = locationId || '';
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
        if (effectiveLocationId && mongoose.Types.ObjectId.isValid(effectiveLocationId)) {
            filter.location = effectiveLocationId;
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

        const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, Math.min(100, parseInt(limit)));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

        const [orders, total, revenueAgg] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('items.product', 'sku name')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
                .lean(),
            Order.countDocuments(filter),
            Order.aggregate([{ $match: filter }, { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
        ]);

        const summary = revenueAgg[0] || { totalRevenue: 0, count: 0 };

        return res.status(200).json({
            success: true,
            data: {
                orders,
                summary: {
                    totalRevenue: summary.totalRevenue,
                    totalOrders: summary.count,
                },
                pagination: {
                    page: Math.max(1, parseInt(page)),
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
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
 * Khi đã thanh toán: bắt buộc gửi thông tin chuyển khoản hoàn tiền (refundBankName, refundBankAccount, refundAccountHolder).
 * Hoàn lại tồn kho khi hủy.
 */
export const cancelOrderByCustomer = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { refundBankName, refundBankAccount, refundAccountHolder } = req.body || {};

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
            const bankAccount = String(refundBankAccount || '').trim();
            const accountHolder = String(refundAccountHolder || '').trim();
            if (!bankName || !bankAccount || !accountHolder) {
                return res.status(400).json({
                    message: 'Đơn đã thanh toán. Vui lòng nhập thông tin tài khoản ngân hàng để hoàn tiền.',
                });
            }
            order.refundBankName = bankName;
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

        // Hoàn lại tồn kho
        const locationId = order.location;
        for (const item of order.items) {
            const stockRow = await ProductStock.findOne({
                product: item.product,
                location: locationId,
            });
            if (stockRow) {
                stockRow.quantity += item.quantity;
                await stockRow.save();
            }
        }

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
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
        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
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
 * Chỉ Admin/Manager. Body: { status?, paymentStatus? }
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
            const validStatuses = ['pending', 'completed', 'cancelled'];
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

        // Khi hủy đơn: hoàn lại tồn kho (chỉ khi đơn chưa từng bị hủy trước đó)
        if (order.status === 'cancelled' && previousStatus !== 'cancelled') {
            const locationId = order.location;
            for (const item of order.items) {
                const stockRow = await ProductStock.findOne({
                    product: item.product,
                    location: locationId,
                });
                if (stockRow) {
                    stockRow.quantity += item.quantity;
                    await stockRow.save();
                }
            }
        }

        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật đơn hàng thành công',
            data: { order: populated },
        });
    } catch (error) {
        console.error('updateOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật đơn hàng',
            error: error.message,
        });
    }
};
