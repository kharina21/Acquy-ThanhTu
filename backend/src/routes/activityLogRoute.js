import express from 'express';
import {
    getActivityLogs,
    getActivityLogById,
    getMyActivityLogs,
    deleteActivityLog,
} from '../controllers/activityLogController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticate);

// Lấy activity logs của chính mình
router.get('/me', getMyActivityLogs);

// Lấy chi tiết một log
router.get('/:id', getActivityLogById);

// Lấy danh sách logs (chỉ admin)
router.get('/', hasRole('admin'), getActivityLogs);

// Xóa log (chỉ admin)
router.delete('/:id', hasRole('admin'), deleteActivityLog);

export default router;
