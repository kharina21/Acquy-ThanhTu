import express from 'express';
import {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
} from '../controllers/roleController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Chỉ admin mới được quản lý vai trò / permissions
router.use(authenticate);
router.use(hasRole('admin'));

router.get('/', getAllRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;

