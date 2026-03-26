import { PayOS } from '@payos/node';
import QRCode from 'qrcode';
import { getVietQRQuickLink } from './vietqrHelper.js';

let payosInstance = null;

const getPayOS = () => {
    if (payosInstance) return payosInstance;
    const clientId = process.env.POS_CLIENT_ID || '';
    const apiKey = process.env.POS_API_KEY || '';
    const checksumKey = process.env.POS_CHECKSUM_KEY || '';
    if (!clientId || !apiKey || !checksumKey) return null;
    payosInstance = new PayOS({ clientId, apiKey, checksumKey });
    return payosInstance;
};

/**
 * Tạo orderCode integer cho PayOS (6–19 chữ số, unique).
 * Dùng timestamp + random để tránh trùng khi tạo nhiều link cho cùng đơn.
 */
const toPayOSOrderCode = () => {
    const t = Date.now() % 1000000000000; // 12 chữ số
    const r = Math.floor(Math.random() * 10000); // 4 chữ số
    return t * 10000 + r;
};

/**
 * Tạo link thanh toán PayOS (đầy đủ tính năng).
 * @param {Object} params
 * @param {string} params.orderId - ID đơn hàng
 * @param {string} params.orderCode - Mã đơn (ORD-xxx)
 * @param {number} params.amount - Số tiền VNĐ
 * @param {string} params.description - Mô tả (tối đa 9 ký tự cho TK không liên kết PayOS)
 * @param {string} params.returnUrl - URL khi thanh toán thành công
 * @param {string} params.cancelUrl - URL khi hủy
 * @param {Array} params.items - Danh sách sản phẩm (optional)
 * @returns {Promise<{checkoutUrl, qrDataURL, bankAccount, order}>}
 */
export const createPayOSPaymentLink = async ({ orderId, orderCode, amount, description = '', returnUrl, cancelUrl, items = [] }) => {
    const payos = getPayOS();
    if (!payos) {
        throw new Error('Chưa cấu hình PayOS. Thêm POS_CLIENT_ID, POS_API_KEY, POS_CHECKSUM_KEY vào .env');
    }

    const orderCodeInt = toPayOSOrderCode();
    const amountInt = Math.round(Number(amount) || 0);
    const orderRef9 = String(orderCode || '')
        .replace(/[^\w]/g, '')
        .slice(0, 9)
        .trim();
    const orderRef25 = String(orderCode || '')
        .replace(/[^\w]/g, '')
        .slice(0, 25)
        .trim();
    const idTail = String(orderId || '')
        .replace(/\D/g, '')
        .slice(-10);
    /** Mô tả PayOS (giới hạn ~9 ký tự): ưu tiên mô tả từ route; không dùng chữ chung "thanh toán tại quầy". */
    const desc =
        String(description || '')
            .replace(/[^\w]/g, '')
            .slice(0, 9)
            .trim() ||
        orderRef9 ||
        (idTail ? `D${idTail}`.slice(0, 9) : '') ||
        'DonHang';

    const body = {
        orderCode: orderCodeInt,
        amount: amountInt,
        description: desc,
        returnUrl: String(returnUrl || '').trim(),
        cancelUrl: String(cancelUrl || '').trim(),
    };
    if (items?.length > 0) {
        body.items = items.map((i) => ({
            name: String(i.name || 'San pham').slice(0, 100),
            quantity: Math.max(1, Number(i.quantity) || 1),
            price: Math.round(Number(i.price) || 0),
        }));
    }

    const data = await payos.paymentRequests.create(body);

    if (!data?.checkoutUrl) {
        throw new Error('Không thể tạo link thanh toán PayOS');
    }

    let qrDataURL = null;
    if (data.qrCode) {
        try {
            qrDataURL = await QRCode.toDataURL(data.qrCode, { margin: 2, width: 256 });
        } catch {
            qrDataURL = null;
        }
    }

    if (!qrDataURL && data.bin && data.accountNumber && data.accountName) {
        /** Nội dung CK trên VietQR: mã đơn cửa hàng (đối soát), không dùng mô tả PayOS rút gọn. */
        const transferMemo =
            orderRef25 ||
            (idTail ? `DH${idTail}` : '') ||
            String(data.description || '')
                .replace(/[^\w\s]/g, '')
                .slice(0, 25)
                .trim();
        qrDataURL = getVietQRQuickLink({
            bankCode: data.bin,
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            amount: data.amount,
            memo: transferMemo,
        });
    }

    return {
        checkoutUrl: data.checkoutUrl,
        qrDataURL,
        bankAccount: {
            bankCode: data.bin,
            bankName: null,
            bankAccount: data.accountNumber,
            userBankName: data.accountName,
        },
        order: {
            code: orderCode,
            totalAmount: data.amount,
        },
        paymentLinkId: data.paymentLinkId,
        orderCode: orderCodeInt, // PayOS orderCode – dùng cho webhook mapping
    };
};

/**
 * Lấy trạng thái thanh toán từ PayOS API (GET /v2/payment-requests/{id}).
 * @param {number} orderCode - Mã đơn PayOS (orderCode integer)
 * @returns {Promise<{status: string, amountPaid?: number} | null>} null nếu PayOS chưa cấu hình hoặc lỗi
 */
export const getPayOSPaymentStatus = async (orderCode) => {
    const payos = getPayOS();
    if (!payos || !orderCode) return null;
    try {
        const res = await payos.get(`/v2/payment-requests/${orderCode}`);
        // PayOS API: { code, desc, data: { status, amountPaid, ... } } hoặc SDK có thể unwrap
        const data = res?.data ?? res;
        if (!data || typeof data !== 'object') return null;
        const status = String(data.status || '').toUpperCase();
        return { status, amountPaid: data.amountPaid };
    } catch (err) {
        console.warn('getPayOSPaymentStatus error:', err?.message);
        return null;
    }
};

/**
 * Xác thực và lấy dữ liệu webhook từ PayOS.
 * @param {Object} webhookBody - Body từ PayOS { code, desc, success, data, signature }
 * @returns {Promise<Object>} data đã xác thực
 */
export const verifyPayOSWebhook = async (webhookBody) => {
    const payos = getPayOS();
    if (!payos) throw new Error('PayOS chưa cấu hình');
    return payos.webhooks.verify(webhookBody);
};
