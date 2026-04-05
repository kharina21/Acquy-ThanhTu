import express from 'express';
import {
    getAllUsageDevices,
    getUsageDeviceById,
    createUsageDevice,
    updateUsageDevice,
    deleteUsageDevice,
} from '../controllers/usageDeviceController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Tất cả routes đều cần authenticate và có role admin hoặc manager
router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/', getAllUsageDevices);
router.get('/:id', getUsageDeviceById);
router.post('/', createUsageDevice);
router.put('/:id', updateUsageDevice);
router.delete('/:id', deleteUsageDevice);

export default router;

