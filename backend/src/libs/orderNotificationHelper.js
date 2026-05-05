import Order from '../models/Order.js';
import { sendOrderStatusUpdateEmail } from './emailHelper.js';

const GUEST_POS_EMAIL = 'guest@pos.system';

/** Ưu tiên email Customer profile, sau đó User; bỏ qua khách vãng lai POS. */
export function resolveOrderNotificationRecipient(order) {
    const prof = order.customerProfile;
    const cust = order.customer;
    let email = '';
    if (prof && typeof prof === 'object' && prof.email) email = String(prof.email).trim();
    if (!email && cust && typeof cust === 'object' && cust.email) email = String(cust.email).trim();
    if (!email || !email.includes('@')) return null;
    const lower = email.toLowerCase();
    if (lower === GUEST_POS_EMAIL) return null;

    const nameFromProf = prof && typeof prof === 'object' && prof.name ? String(prof.name).trim() : '';
    let nameFromUser = '';
    if (cust && typeof cust === 'object') {
        const parts = [cust.firstName, cust.lastName].filter(Boolean);
        nameFromUser = parts.join(' ').trim();
        if (!nameFromUser && cust.username) nameFromUser = String(cust.username).trim();
    }
    const name = nameFromProf || nameFromUser || 'Quý khách';
    return { email, name };
}

/**
 * Sau khi đơn đã lưu: đọc lại DB; nếu status/payment khác snapshot thì gửi một email gộp.
 */
export async function notifyOrderCustomerStatusChange(orderId, previousStatus, previousPaymentStatus) {
    try {
        if (!orderId) return;
        const order = await Order.findById(orderId)
            .populate('customer', 'username email firstName lastName')
            .populate('customerProfile', 'name phone type email')
            .lean();
        if (!order) return;
        if (order.status === previousStatus && order.paymentStatus === previousPaymentStatus) return;

        const recip = resolveOrderNotificationRecipient(order);
        if (!recip) return;

        await sendOrderStatusUpdateEmail({
            toEmail: recip.email,
            customerName: recip.name,
            orderCode: order.code,
            orderId: order._id,
            prevStatus: previousStatus,
            newStatus: order.status,
            prevPaymentStatus: previousPaymentStatus,
            newPaymentStatus: order.paymentStatus,
        });
    } catch (e) {
        console.error('notifyOrderCustomerStatusChange:', e.message);
    }
}
