import express from 'express';
import {
    getActiveLocations,
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

router.use(hasRole('admin', 'manager', 'Quản lý chi nhánh'));

router.get('/', getAllLocations);
router.get('/:id', getLocationById);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
