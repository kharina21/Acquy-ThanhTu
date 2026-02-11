import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    getDashboard,
    getReportEndOfDay,
    getReportSales,
    getReportBestSelling,
} from '../controllers/managerController.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('manager'));

router.get('/dashboard', getDashboard);
router.get('/reports/end-of-day', getReportEndOfDay);
router.get('/reports/sales', getReportSales);
router.get('/reports/best-selling', getReportBestSelling);

export default router;
