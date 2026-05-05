import express from 'express';
import {
    getAllMemberPolicies,
    createMemberPolicy,
    updateMemberPolicy,
    deleteMemberPolicy,
} from '../controllers/memberPolicyController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);

const policyReaders = hasRole(
    'admin',
    'manager',
    'Quản lý chi nhánh',
    'seller',
    'staff',
    'Nhân viên bán hàng',
);

router.get('/', policyReaders, getAllMemberPolicies);

// Chỉ admin quản lý hạng thành viên (tạo/sửa/xóa)
router.post('/', hasRole('admin'), createMemberPolicy);
router.put('/:id', hasRole('admin'), updateMemberPolicy);
router.delete('/:id', hasRole('admin'), deleteMemberPolicy);

export default router;

