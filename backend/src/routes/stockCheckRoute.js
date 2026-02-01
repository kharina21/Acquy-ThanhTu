import express from 'express';
import {
    getNextCode,
    getAllStockChecks,
    getStockCheckById,
    createStockCheck,
    confirmStockCheck,
} from '../controllers/stockCheckController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'owner'));

router.get('/next-code', getNextCode);
router.get('/', getAllStockChecks);
router.get('/:id', getStockCheckById);
router.post('/', createStockCheck);
router.put('/:id/confirm', confirmStockCheck);

export default router;
