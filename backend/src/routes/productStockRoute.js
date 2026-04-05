import express from 'express';
import { getProductStocks, setProductStock, bulkSetProductStock } from '../controllers/productStockController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/', getProductStocks);
router.put('/', setProductStock);
router.put('/bulk', bulkSetProductStock);

export default router;
