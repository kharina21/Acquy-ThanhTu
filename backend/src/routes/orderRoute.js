import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    createOrder,
    createOrderFromItems,
    getOrders,
    getOrderById,
    updateOrder,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createOrder);
router.post('/from-items', createOrderFromItems);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id', hasRole('admin', 'Quản lý chi nhánh', 'seller', 'staff'), updateOrder);

export default router;
