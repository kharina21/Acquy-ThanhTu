import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    getOrderReport,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOrder);
router.get('/report', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getOrderReport);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id', hasRole('admin', 'manager', 'Quản lý chi nhánh'), updateOrder);

export default router;
