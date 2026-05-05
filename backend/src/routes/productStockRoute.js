import express from 'express';
import { getProductStocks, setProductStock, bulkSetProductStock } from '../controllers/productStockController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
/** Đọc tồn: POS / NV bán hàng cần xem tồn theo chi nhánh; chỉnh tồn vẫn hạn chế role kho/quản lý. */
router.get(
    '/',
    hasRole(
        'admin',
        'manager',
        'warehouse_manager',
        'Quản lý chi nhánh',
        'seller',
        'staff',
        'Nhân viên bán hàng',
    ),
    getProductStocks,
);
router.put('/', hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'), setProductStock);
router.put('/bulk', hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'), bulkSetProductStock);

export default router;
