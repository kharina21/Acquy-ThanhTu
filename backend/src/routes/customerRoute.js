import express from 'express';
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
    searchCustomersByPhone,
} from '../controllers/customerController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
);

router.get('/search', searchCustomersByPhone);
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.post('/:id/restore', restoreCustomer);
router.delete('/:id', deleteCustomer);

export default router;
