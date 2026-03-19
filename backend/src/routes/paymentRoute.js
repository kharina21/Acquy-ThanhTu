import express from 'express';
import { handlePayOSWebhook, webhookHealthCheck } from '../controllers/paymentController.js';

const router = express.Router();

// Webhook PayOS – không dùng authenticate (PayOS gọi từ server của họ)
router.get('/webhook', webhookHealthCheck);
router.post('/webhook', handlePayOSWebhook);

export default router;
