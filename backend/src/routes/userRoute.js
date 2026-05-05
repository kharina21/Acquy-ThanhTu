import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    assignRoles,
    removeRoles,
    resetUserPassword,
    getAllRoles,
} from '../controllers/userController.js';
import {
    createUserValidation,
    updateUserValidation,
    assignRolesValidation,
    removeRolesValidation,
    resetPasswordValidation,
    handleValidationErrors,
} from '../validators/userValidator.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);

// Đọc danh sách / roles / chi tiết: admin hoặc quản lý chi nhánh (POS cần tải người bán)
router.get('/roles', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getAllRoles);
router.get('/', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getAllUsers);
router.get('/:id', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getUserById);

// Thao tác ghi: chỉ admin
router.use(hasRole('admin'));

// Tạo user mới
router.post(
    '/',
    createUserValidation,
    handleValidationErrors,
    createUser
);

// Cập nhật thông tin user
router.put(
    '/:id',
    updateUserValidation,
    handleValidationErrors,
    updateUser
);

// Xóa user
router.delete('/:id', deleteUser);

// Gán roles cho user
router.post(
    '/:id/roles',
    assignRolesValidation,
    handleValidationErrors,
    assignRoles
);

// Xóa roles khỏi user
router.delete(
    '/:id/roles',
    removeRolesValidation,
    handleValidationErrors,
    removeRoles
);

// Đặt lại mật khẩu cho user
router.put(
    '/:id/reset-password',
    resetPasswordValidation,
    handleValidationErrors,
    resetUserPassword
);

export default router;

