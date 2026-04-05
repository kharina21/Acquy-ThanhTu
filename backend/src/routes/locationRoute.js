import express from 'express';
import {
    getActiveLocations,
    getOnlineLocationHandler,
    setOnlineLocation,
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
} from '../controllers/locationController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);

// Cho user checkout – chỉ cần đăng nhập, trả về chi nhánh active
router.get('/active', getActiveLocations);
// Chi nhánh bán online (cho frontend)
router.get('/online', getOnlineLocationHandler);

const locationReaders = hasRole(
    'admin',
    'manager',
    'warehouse_manager',
    'Quản lý chi nhánh',
    'seller',
    'staff',
    'Nhân viên bán hàng',
);

router.get('/', locationReaders, getAllLocations);
router.get('/:id', locationReaders, getLocationById);

router.post('/', hasRole('admin', 'manager'), createLocation);
router.put('/:id/set-online', hasRole('admin', 'manager'), setOnlineLocation);
router.put('/:id', hasRole('admin', 'manager'), updateLocation);
router.delete('/:id', hasRole('admin', 'manager'), deleteLocation);

export default router;
