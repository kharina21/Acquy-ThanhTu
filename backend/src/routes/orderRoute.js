import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    createOrder,
    createOrderFromItems,
    getOrders,
    getOrderById,
    updateOrder,
    getOrderReport,
    generateVietQRForOrder,
    checkoutPreview,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOrder);
router.post('/from-items', createOrderFromItems);
router.get('/report', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getOrderReport);
router.get('/checkout-preview', checkoutPreview);
router.get('/', getOrders);
router.get('/:id/generate-vietqr', generateVietQRForOrder);
router.get('/:id', getOrderById);
router.put('/:id', hasRole('admin', 'Quản lý chi nhánh', 'manager', 'seller', 'staff'), updateOrder);

export default router;
