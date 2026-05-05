import express from 'express';
import {
    getNextCode,
    getAllStockChecks,
    getStockCheckById,
    createStockCheck,
    updateStockCheck,
    confirmStockCheck,
    reopenStockCheck,
    deleteStockCheck,
} from '../controllers/stockCheckController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/next-code', getNextCode);
router.get('/', getAllStockChecks);
router.post('/', createStockCheck);
router.put('/:id/confirm', confirmStockCheck);
router.put('/:id/reopen', reopenStockCheck);
router.put('/:id', updateStockCheck);
router.delete('/:id', deleteStockCheck);
router.get('/:id', getStockCheckById);

export default router;
