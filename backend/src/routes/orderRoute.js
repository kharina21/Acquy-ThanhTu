import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    createOrder,
    createOrderFromItems,
    getOrders,
    getOrderById,
    updateOrder,
    updateOrderByCustomer,
    cancelOrderByCustomer,
    syncPaymentFromPayOS,
    getOrderReport,
    generateVietQRForOrder,
    checkoutPreview,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);

// Mua hàng online (chỉ user, customer)
router.post('/', hasRole('user', 'customer'), createOrder);
router.get('/checkout-preview', hasRole('user', 'customer'), checkoutPreview);
router.get(
    '/:id/generate-vietqr',
    hasRole('user', 'customer', 'admin', 'manager', 'seller'),
    generateVietQRForOrder,
);
router.get('/:id/sync-payment', hasRole('user', 'customer', 'admin', 'manager', 'seller'), syncPaymentFromPayOS);
router.post('/:id/cancel', hasRole('user', 'customer'), cancelOrderByCustomer);
router.patch('/:id', hasRole('user', 'customer'), updateOrderByCustomer);

// Bán tại quầy (admin, manager, seller)
router.post('/from-items', hasRole('admin', 'manager', 'seller'), createOrderFromItems);

// Báo cáo (admin, manager)
router.get('/report', hasRole('admin', 'manager'), getOrderReport);

// Xem đơn: user/customer xem đơn của mình; admin/manager/seller xem đơn cửa hàng
router.get('/', getOrders);
router.get('/:id', getOrderById);

// Cập nhật đơn (xác nhận, thanh toán) - admin, manager, seller
router.put('/:id', hasRole('admin', 'manager', 'seller'), updateOrder);

export default router;
