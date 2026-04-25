/**
 * Badge trạng thái đơn hàng và thanh toán – có màu rõ ràng
 */
const STATUS_CONFIG = {
    pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-900 border-amber-400' },
    /** Đơn online: đã thanh toán, chờ kho xuất hàng */
    confirmed: { label: 'Đã xác nhận · chờ xuất kho', className: 'bg-sky-100 text-sky-900 border-sky-500' },
    /** Đã xuất kho / giao hàng xong (online & tại quầy) */
    completed: { label: 'Đã xuất kho / hoàn thành', className: 'bg-green-100 text-green-800 border-green-500' },
    cancelled: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-700 border-slate-400' },
    /** Dữ liệu cũ */
    paid: { label: 'Hoàn thành', className: 'bg-green-100 text-green-800 border-green-500' },
};

const PAYMENT_STATUS_CONFIG = {
    pending: { label: 'Chờ thanh toán', className: 'bg-orange-100 text-orange-900 border-orange-400' },
    paid: { label: 'Đã thanh toán', className: 'bg-green-100 text-green-800 border-green-500' },
    failed: { label: 'Thất bại', className: 'bg-red-100 text-red-800 border-red-500' },
    refunded: { label: 'Đã hoàn tiền', className: 'bg-sky-100 text-sky-800 border-sky-500' },
};

export function OrderStatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>{config.label}</span>;
}

export function PaymentStatusBadge({ status }) {
    const config = PAYMENT_STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>{config.label}</span>;
}

export { STATUS_CONFIG, PAYMENT_STATUS_CONFIG };
