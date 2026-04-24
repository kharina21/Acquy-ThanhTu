import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    lookupWarrantyByOrderCode,
    getWarrantyById,
    getWarranties,
    createWarrantyClaim,
    updateWarrantyClaim,
    getWarrantiesByOrderCode,
    getWarrantyStats,
} from '../controllers/warrantyController.js';

const router = express.Router();

// ── Public routes (không cần đăng nhập) ──────────────────────────────

/**
 * GET /api/warranties/lookup/:orderCode
 * Tra cứu bảo hành bằng mã hóa đơn – ai cũng xem được
 */
router.get('/lookup/:orderCode', lookupWarrantyByOrderCode);

// ── Authenticated routes ───────────────────────────────────────────────

router.use(authenticate);

/**
 * GET /api/warranties/stats
 * Thống kê bảo hành – Admin/Manager
 */
router.get('/stats', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getWarrantyStats);

/**
 * GET /api/warranties/order/:orderCode
 * Tất cả bảo hành của một hóa đơn – Admin/Manager/Seller/Staff
 */
router.get(
    '/order/:orderCode',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getWarrantiesByOrderCode,
);

/**
 * GET /api/warranties
 * Danh sách bảo hành – Admin/Manager/Seller/Staff
 * Query: page, limit, status, orderCode, productId, customerId, dateFrom, dateTo
 */
router.get(
    '/',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getWarranties,
);

/**
 * GET /api/warranties/:id
 * Chi tiết một bảo hành – Admin/Manager/Seller/Staff
 */
router.get(
    '/:id',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getWarrantyById,
);

/**
 * POST /api/warranties/:id/claim
 * Tạo yêu cầu bảo hành – Customer/User
 */
router.post('/:id/claim', hasRole('user', 'customer', 'admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'), createWarrantyClaim);

/**
 * PUT /api/warranties/:id/claims/:claimCode
 * Cập nhật yêu cầu bảo hành – Admin/Manager/Seller/Staff
 */
router.put(
    '/:id/claims/:claimCode',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    updateWarrantyClaim,
);

export default router;
