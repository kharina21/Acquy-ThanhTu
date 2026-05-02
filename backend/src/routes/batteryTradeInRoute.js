import express from 'express';
import multer from 'multer';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    submitBatteryTradeIn,
    getBatteryTradeInList,
    getBatteryTradeInById,
    getMyBatteryTradeIns,
    updateBatteryTradeInStatus,
    uploadBatteryImage,
    lookupBatteryTradeIn,
    getBatteryTradeInPrefill,
    updateBatteryTradeInByLookup,
    deleteBatteryTradeInByLookup,
    updateBatteryTradeInDetailsByAdmin,
    createBatteryTradeInOffline,
    sellBatteryTradeIn,
    getBatteryTradeInStats,
} from '../controllers/batteryTradeInController.js';

const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Chỉ chấp nhận ảnh (JPEG, PNG, WebP, GIF)'), false);
    },
});

const router = express.Router();

// Public - Upload ảnh acquy
router.post('/upload-image', uploadImage.array('image', 5), uploadBatteryImage);

// Public - Tra cứu / prefill / sửa-xóa khi đang xử lý (mã + Gmail)
router.get('/lookup/prefill', getBatteryTradeInPrefill);
router.post('/lookup', lookupBatteryTradeIn);
router.patch('/lookup', updateBatteryTradeInByLookup);
router.post('/lookup/delete', deleteBatteryTradeInByLookup);

// Public - Gửi yêu cầu thu cũ (guest và customer đều dùng được, optional auth để lưu userId nếu đã đăng nhập)
router.post('/', optionalAuthenticate, submitBatteryTradeIn);

// Đã đăng nhập — đơn thu cũ của chính user (không cần admin)
router.get('/mine', authenticate, getMyBatteryTradeIns);

// Admin/Manager - Lấy danh sách và cập nhật trạng thái
router.use(authenticate);
router.use(hasRole('admin', 'manager', 'Quản lý chi nhánh', 'seller'));

router.get('/stats', getBatteryTradeInStats);
router.get('/', getBatteryTradeInList);
router.post('/create-offline', createBatteryTradeInOffline);
router.get('/:id', getBatteryTradeInById);
router.patch('/:id/details', updateBatteryTradeInDetailsByAdmin);
router.patch('/:id', updateBatteryTradeInStatus);
router.post('/:id/sell', sellBatteryTradeIn);

export default router;
