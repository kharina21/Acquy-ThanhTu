import express from 'express';
import {
    getNextCode,
    getAllStockChecks,
    getStockCheckById,
    createStockCheck,
    updateStockCheck,
    confirmStockCheck,
} from '../controllers/stockCheckController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager'));

router.get('/next-code', getNextCode);
router.get('/', getAllStockChecks);
router.post('/', createStockCheck);
router.put('/:id/confirm', confirmStockCheck);
router.put('/:id', updateStockCheck);
router.get('/:id', getStockCheckById);

export default router;
