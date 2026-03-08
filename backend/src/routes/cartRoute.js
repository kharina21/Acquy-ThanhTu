import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import {
    getCart,
    addItemToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from '../controllers/cartController.js';

const router = express.Router();

// Tất cả routes giỏ hàng đều yêu cầu đăng nhập
router.use(authenticate);

// Lấy giỏ hàng hiện tại của user
router.get('/', getCart);

// Thêm sản phẩm vào giỏ: { productId, quantity }
router.post('/items', addItemToCart);

// Cập nhật số lượng một sản phẩm trong giỏ
router.put('/items/:productId', updateCartItem);

// Xóa một sản phẩm khỏi giỏ
router.delete('/items/:productId', removeCartItem);

// Xóa toàn bộ giỏ hàng
router.delete('/', clearCart);

export default router;

