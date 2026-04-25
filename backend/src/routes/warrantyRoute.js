import express from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';
import {
    lookupWarrantyByOrderCode,
    submitClaimFromOrder,
    getWarrantyById,
    getWarranties,
    getAllClaims,
    updateWarrantyClaim,
    getWarrantiesByOrderCode,
    getWarrantyStats,
} from '../controllers/warrantyController.js';

const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)'));
        }
        cb(null, true);
    },
});

const router = express.Router();

/**
 * POST /api/warranties/upload-images
 * Upload ảnh bảo hành lên Cloudinary – public
 * Body: multipart/form-data, field: images[] (tối đa 10 file, 5MB/file)
 */
router.post('/upload-images', uploadImage.array('images', 10), async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            return res.status(503).json({ message: 'Dịch vụ upload ảnh chưa được cấu hình.' });
        }
        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ message: 'Không có file nào được gửi.' });
        }
        const urls = [];
        for (const file of files) {
            if (!file.buffer) continue;
            const result = await uploadImageFromBuffer(file.buffer, file.mimetype, 'warranty-claims');
            urls.push(result.url);
        }
        return res.status(200).json({ success: true, data: { urls } });
    } catch (error) {
        console.error('uploadWarrantyImages error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi tải ảnh lên.', error: error.message });
    }
});

/**
 * GET /api/warranties/lookup/:orderCode
 * Tra cứu bảo hành bằng mã hóa đơn – ai cũng xem được
 */
router.get('/lookup/:orderCode', lookupWarrantyByOrderCode);

/**
 * POST /api/warranties/claim-from-order
 * Gửi yêu cầu bảo hành từ mã hóa đơn – không cần đăng nhập
 * Body: { orderCode, productId, reason, description, images[], customerName, customerPhone, customerAddress, notes }
 */
router.post('/claim-from-order', submitClaimFromOrder);

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

export default router;
