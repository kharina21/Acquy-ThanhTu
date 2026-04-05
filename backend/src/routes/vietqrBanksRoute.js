import express from 'express';
import { getVietQrBanksPublic } from '../controllers/vietqrBanksController.js';

const router = express.Router();

/** Không cần đăng nhập — chỉ đọc danh sách NH công khai */
router.get('/', getVietQrBanksPublic);

export default router;
