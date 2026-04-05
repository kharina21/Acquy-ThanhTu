import express from 'express';
import {
    getNextCode,
    getAllStockOuts,
    getStockOutById,
    createStockOut,
    updateStockOut,
    deleteStockOut,
    confirmStockOut,
} from '../controllers/stockOutController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/next-code', getNextCode);
router.get('/', getAllStockOuts);
router.get('/:id', getStockOutById);
router.post('/', createStockOut);
router.put('/:id/confirm', confirmStockOut);
router.put('/:id', updateStockOut);
router.delete('/:id', deleteStockOut);

export default router;
