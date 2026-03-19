import express from 'express';
import {
    getNextCode,
    getAllStockReturns,
    getStockReturnById,
    createStockReturn,
} from '../controllers/stockReturnController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager'));

router.get('/next-code', getNextCode);
router.get('/', getAllStockReturns);
router.get('/:id', getStockReturnById);
router.post('/', createStockReturn);

export default router;
