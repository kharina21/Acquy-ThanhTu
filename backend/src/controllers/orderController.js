import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import ProductStock from '../models/ProductStock.js';
import { getStockAtLocation } from './productStockController.js';

const isAdminOrManager = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    return roleNames.some((r) => r === 'admin' || r === 'Quản lý chi nhánh');
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
 * POST /api/orders – Tạo đơn hàng từ giỏ hàng (online, bán trên web).
 * Body: { locationId, paymentMethod, shippingAddress?, note? }
 */
export const createOrder = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { locationId, paymentMethod, shippingAddress = '', note = '' } = req.body || {};

        if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh/kho' });
        }

        const validMethods = ['vietqr', 'cash', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'transfer';

        const location = await Location.findById(locationId);
        if (!location || !location.isActive) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh hoặc chi nhánh không hoạt động' });
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
            const stock = await getStockAtLocation(productId, locationId);

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

        const code = await generateOrderCode();

        const order = await Order.create({
            code,
            channel: 'online',
            customer: userId,
            location: locationId,
            createdBy: null,
            items: orderItems,
            totalAmount,
            status: 'pending',
            paymentMethod: method,
            paymentStatus: 'pending',
            shippingAddress: String(shippingAddress).trim(),
            note: String(note).trim(),
        });

        for (const item of orderItems) {
            const stock = await ProductStock.findOne({ product: item.product, location: locationId });
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

        const canViewAll = await isAdminOrManager(userId);

        const filter = {};
        if (!canViewAll) {
            filter.customer = userId;
        }

        const { page = 1, limit = 10, status, paymentStatus } = req.query;
        const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, Math.min(100, parseInt(limit)));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('items.product', 'sku name')
                .populate('location', 'code name')
                .populate('customer', 'username email firstName lastName')
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
            .populate('items.product', 'sku name price')
            .populate('location', 'code name address phone')
            .populate('customer', 'username email firstName lastName phoneNumber')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const canViewAll = await isAdminOrManager(userId);

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

        if (status) {
            const validStatuses = ['pending', 'confirmed', 'paid', 'cancelled'];
            if (validStatuses.includes(status)) order.status = status;
        }
        if (paymentStatus) {
            const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
            if (validPaymentStatuses.includes(paymentStatus)) order.paymentStatus = paymentStatus;
            if (paymentStatus === 'paid') order.paidAt = new Date();
        }

        await order.save();

        const populated = await Order.findById(order._id)
            .populate('items.product', 'sku name')
            .populate('location', 'code name')
            .populate('customer', 'username email firstName lastName')
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
