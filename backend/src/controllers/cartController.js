import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import { getStockAtLocation } from './productStockController.js';

/** Lấy chi nhánh mặc định cho đơn online (chi nhánh đầu tiên đang hoạt động). */
const getDefaultLocation = async () => {
    return Location.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
};

const mapCartToResponse = (cart) => {
    if (!cart) {
        return [];
    }

    return cart.items.map((item) => {
        const productDoc = item.product && typeof item.product === 'object' ? item.product : null;

        const productId = productDoc?._id || item.product;
        const name =
            productDoc?.name ||
            item.nameSnapshot ||
            '';
        const price =
            typeof productDoc?.price === 'number'
                ? productDoc.price
                : typeof item.priceSnapshot === 'number'
                ? item.priceSnapshot
                : 0;
        const image =
            productDoc?.images?.[0] ||
            productDoc?.image ||
            item.imageSnapshot ||
            '';

        return {
            productId,
            name,
            price,
            image,
            quantity: item.quantity,
        };
    });
};

/** Thêm stock vào từng item. */
const addStockToItems = async (items, locationId) => {
    if (!locationId || !items?.length) return items;
    const result = [];
    for (const item of items) {
        const stock = await getStockAtLocation(item.productId, locationId);
        result.push({ ...item, stock });
    }
    return result;
};

const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
        cart = await Cart.create({ userId, items: [] });
    }
    return cart;
};

export const getCart = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const cart = await Cart.findOne({ userId })
            .populate('items.product', 'name price image images isDeleted')
            .lean();

        let items = mapCartToResponse(cart);
        const defaultLocation = await getDefaultLocation();
        if (defaultLocation) {
            items = await addStockToItems(items, defaultLocation._id);
        }

        return res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error) {
        console.error('getCart error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy giỏ hàng',
            error: error.message,
        });
    }
};

export const addItemToCart = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { productId, quantity = 1 } = req.body || {};

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'productId không hợp lệ' });
        }

        const qty = Number(quantity) || 1;
        if (qty <= 0) {
            return res.status(400).json({ message: 'Số lượng phải lớn hơn 0' });
        }

        const product = await Product.findOne({ _id: productId, isDeleted: false }).lean();
        if (!product) {
            return res.status(404).json({ message: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh' });
        }

        const cart = await getOrCreateCart(userId);

        const existingIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId.toString()
        );

        const newQuantity = existingIndex !== -1 ? cart.items[existingIndex].quantity + qty : qty;

        // Kiểm tra tồn kho trước khi thêm
        const defaultLocation = await getDefaultLocation();
        if (defaultLocation) {
            const stock = await getStockAtLocation(productId, defaultLocation._id);
            if (newQuantity > stock) {
                return res.status(400).json({
                    message: `Số lượng vượt quá tồn kho. Tồn kho hiện tại: ${stock}`,
                });
            }
        }

        if (existingIndex !== -1) {
            cart.items[existingIndex].quantity += qty;
        } else {
            cart.items.push({
                product: product._id,
                quantity: qty,
                priceSnapshot: product.price ?? 0,
                nameSnapshot: product.name ?? '',
                imageSnapshot: product.images?.[0] || product.image || '',
            });
        }

        await cart.save();

        const populated = await Cart.findOne({ userId })
            .populate('items.product', 'name price image images isDeleted')
            .lean();

        let items = mapCartToResponse(populated);
        if (defaultLocation) {
            items = await addStockToItems(items, defaultLocation._id);
        }

        return res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error) {
        console.error('addItemToCart error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi thêm sản phẩm vào giỏ hàng',
            error: error.message,
        });
    }
};

export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { productId } = req.params;
        const { quantity } = req.body || {};

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'productId không hợp lệ' });
        }

        const qty = Number(quantity);
        if (Number.isNaN(qty)) {
            return res.status(400).json({ message: 'quantity không hợp lệ' });
        }

        const cart = await getOrCreateCart(userId);

        const index = cart.items.findIndex(
            (item) => item.product.toString() === productId.toString()
        );

        if (index === -1) {
            return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng' });
        }

        if (qty <= 0) {
            cart.items.splice(index, 1);
        } else {
            const defaultLoc = await getDefaultLocation();
            if (defaultLoc) {
                const stock = await getStockAtLocation(productId, defaultLoc._id);
                if (qty > stock) {
                    return res.status(400).json({
                        message: `Số lượng vượt quá tồn kho. Tồn kho hiện tại: ${stock}`,
                    });
                }
            }
            cart.items[index].quantity = qty;
        }

        await cart.save();

        const populated = await Cart.findOne({ userId })
            .populate('items.product', 'name price image images isDeleted')
            .lean();

        let items = mapCartToResponse(populated);
        const defaultLocation = await getDefaultLocation();
        if (defaultLocation) {
            items = await addStockToItems(items, defaultLocation._id);
        }

        return res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error) {
        console.error('updateCartItem error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật sản phẩm trong giỏ hàng',
            error: error.message,
        });
    }
};

export const removeCartItem = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { productId } = req.params;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'productId không hợp lệ' });
        }

        const cart = await getOrCreateCart(userId);

        const beforeLength = cart.items.length;
        cart.items = cart.items.filter(
            (item) => item.product.toString() !== productId.toString()
        );

        if (cart.items.length === beforeLength) {
            return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng' });
        }

        await cart.save();

        const populated = await Cart.findOne({ userId })
            .populate('items.product', 'name price image images isDeleted')
            .lean();

        let items = mapCartToResponse(populated);
        const defaultLocation = await getDefaultLocation();
        if (defaultLocation) {
            items = await addStockToItems(items, defaultLocation._id);
        }

        return res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error) {
        console.error('removeCartItem error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi xóa sản phẩm khỏi giỏ hàng',
            error: error.message,
        });
    }
};

export const clearCart = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const cart = await getOrCreateCart(userId);
        cart.items = [];
        await cart.save();

        return res.status(200).json({
            success: true,
            data: { items: [] },
        });
    } catch (error) {
        console.error('clearCart error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi xóa giỏ hàng',
            error: error.message,
        });
    }
};

