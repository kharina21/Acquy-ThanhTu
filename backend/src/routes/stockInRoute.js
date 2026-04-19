import express from 'express';
import {
    getNextCode,
    getAllStockIns,
    getStockInById,
    createStockIn,
    updateStockIn,
    deleteStockIn,
    confirmStockIn,
    generateStockInSerials,
} from '../controllers/stockInController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/next-code', getNextCode);
router.post('/generate-serials', generateStockInSerials);
router.get('/', getAllStockIns);
router.get('/:id', getStockInById);
router.post('/', createStockIn);
router.put('/:id/confirm', confirmStockIn);
router.put('/:id', updateStockIn);
router.delete('/:id', deleteStockIn);

export default router;
