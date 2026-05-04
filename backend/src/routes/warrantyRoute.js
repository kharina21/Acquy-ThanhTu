import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    lookupWarrantyByOrderCode,
    getWarrantyById,
    getWarranties,
    getAllClaims,
    updateWarrantyClaim,
    updateWarranty,
    deleteWarranty,
    getWarrantiesByOrderCode,
    getWarrantyStats,
    getClaimStats,
    createWarrantyClaim,
} from '../controllers/warrantyController.js';

const router = express.Router();

/**
 * GET /api/warranties/lookup/:orderCode
 * Tra cứu bảo hành bằng mã hóa đơn – public (ai cũng xem được)
 */
router.get('/lookup/:orderCode', lookupWarrantyByOrderCode);

/**
 * POST /api/warranties/create-claim
 * Tạo phiếu bảo hành – Admin
 * Body: { orderCode, productId, reason, description, customerName, customerPhone, customerAddress, notes }
 */
router.post(
    '/create-claim',
    authenticate,
    hasRole('admin', 'manager', 'Quản lý chi nhánh', 'seller', 'staff', 'Nhân viên bán hàng'),
    createWarrantyClaim,
);

// ── Authenticated routes ───────────────────────────────────────────────

router.use(authenticate);

/**
 * GET /api/warranties/claims
 * Danh sách TẤT CẢ yêu cầu bảo hành – Admin/Manager/Seller/Staff
 * Query: page, limit, claimStatus, reason, orderCode, dateFrom, dateTo, search
 */
router.get(
    '/claims',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getAllClaims,
);

/**
 * GET /api/warranties/stats
 * Thống kê bảo hành – Admin/Manager
 */
router.get('/stats', hasRole('admin', 'manager', 'Quản lý chi nhánh'), getWarrantyStats);

/**
 * GET /api/warranties/claims/stats
 * Thống kê phiếu yêu cầu bảo hành – Admin/Manager/Seller/Staff
 */
router.get(
    '/claims/stats',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getClaimStats,
);

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
 * PUT /api/warranties/:id/claims/:claimCode
 * Cập nhật yêu cầu bảo hành – Admin/Manager/Seller/Staff
 */
router.put(
    '/:id/claims/:claimCode',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    updateWarrantyClaim,
);

/**
 * PUT /api/warranties/:id
 * Cập nhật thông tin bảo hành – Admin/Manager
 * Body: { warrantyEndDate, status, notes }
 */
router.put(
    '/:id',
    hasRole('admin', 'manager', 'Quản lý chi nhánh'),
    updateWarranty,
);

/**
 * DELETE /api/warranties/:id
 * Xóa mềm bảo hành – Admin
 */
router.delete(
    '/:id',
    hasRole('admin'),
    deleteWarranty,
);

export default router;
