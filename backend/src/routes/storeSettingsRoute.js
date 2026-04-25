import express from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/storeSettingsController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();
router.use(authenticate);

const canManage = hasRole('admin', 'manager', 'Quản lý chi nhánh');

router.get('/', canManage, getStoreSettings);
router.put('/', canManage, updateStoreSettings);

export default router;
