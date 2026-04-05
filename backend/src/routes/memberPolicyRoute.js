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
// Chỉ admin quản lý hạng thành viên
router.use(hasRole('admin'));

router.get('/', getAllMemberPolicies);
router.post('/', createMemberPolicy);
router.put('/:id', updateMemberPolicy);
router.delete('/:id', deleteMemberPolicy);

export default router;

