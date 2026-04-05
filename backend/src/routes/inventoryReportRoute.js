import express from 'express';
import {
    getNxtReport,
    getStockInLinesReport,
    getStockOutLinesReport,
} from '../controllers/inventoryReportController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/nxt', getNxtReport);
router.get('/stock-in-lines', getStockInLinesReport);
router.get('/stock-out-lines', getStockOutLinesReport);

export default router;
