import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    getBankAccountsByLocation,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
} from '../controllers/bankAccountController.js';

const router = express.Router();

// Đọc danh sách tài khoản - mọi user đã đăng nhập (cho trang bán hàng)
router.get('/location/:locationId', authenticate, getBankAccountsByLocation);

// Tạo/sửa/xóa - chỉ admin, manager
router.use(authenticate);
router.use(hasRole('admin', 'manager', 'Quản lý chi nhánh'));
router.post('/', createBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);

export default router;
