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

// Tất cả routes đều cần authenticate và có role admin hoặc manager
router.use(authenticate);
router.use(hasRole('admin', 'manager'));

// Lấy danh sách tất cả roles (để hiển thị trong dropdown)
router.get('/roles', getAllRoles);

// Lấy danh sách users
router.get('/', getAllUsers);

// Lấy thông tin chi tiết một user
router.get('/:id', getUserById);

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

