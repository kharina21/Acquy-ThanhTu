import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import { getDashboardStats, getDashboardChartData } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'Quản lý chi nhánh'));
router.get('/stats', getDashboardStats);
router.get('/chart-data', getDashboardChartData);

export default router;
