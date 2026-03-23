import Order from '../models/Order.js';
import PaymentLink from '../models/PaymentLink.js';
import Customer from '../models/Customer.js';
import { verifyPayOSWebhook } from '../libs/payosHelper.js';

/**
 * GET /payments/webhook – PayOS có thể gửi GET để kiểm tra URL khi đăng ký.
 */
export const webhookHealthCheck = (req, res) => {
    return res.status(200).json({ code: '00', desc: 'OK' });
};

/**
 * POST /payments/webhook – Webhook nhận thông báo thanh toán từ PayOS.
 * PayOS gửi khi khách thanh toán thành công. Không dùng authenticate.
 */
export const handlePayOSWebhook = async (req, res) => {
    try {
        const body = req.body || {};
        if (!body.data || !body.signature) {
            return res.status(400).json({ code: '01', desc: 'Invalid webhook data' });
        }

        const data = await verifyPayOSWebhook(body);
        const orderCode = Number(data?.orderCode) || data?.orderCode;
        const success = body.success === true;

        if (!orderCode) {
            return res.status(400).json({ code: '02', desc: 'Missing orderCode' });
        }

        const paymentLink = await PaymentLink.findOne({ orderCode: Number(orderCode) }).lean();
        if (!paymentLink) {
            console.warn('PayOS webhook: PaymentLink not found for orderCode', orderCode);
            return res.status(200).json({ code: '00', desc: 'OK' }); // Trả 200 để PayOS không retry
        }

        if (paymentLink.status === 'paid') {
            return res.status(200).json({ code: '00', desc: 'Already processed' });
        }

        if (success) {
            const order = await Order.findById(paymentLink.order);
            if (order) {
                await Order.findByIdAndUpdate(paymentLink.order, {
                    paymentStatus: 'paid',
                    paidAt: new Date(),
                    vietqrTransactionId: data?.reference || '',
                });
                if (order.customerProfile) {
                    await Customer.findByIdAndUpdate(order.customerProfile, {
                        $inc: { accumulatedAmount: order.totalAmount || 0 },
                    });
                }
            }
            await PaymentLink.updateOne({ _id: paymentLink._id }, { status: 'paid' });
        } else {
            await PaymentLink.updateOne({ _id: paymentLink._id }, { status: 'failed' });
        }

        return res.status(200).json({ code: '00', desc: 'success' });
    } catch (error) {
        console.error('PayOS webhook error:', error.message, error.stack);
        return res.status(500).json({ code: '99', desc: error.message });
    }
};
