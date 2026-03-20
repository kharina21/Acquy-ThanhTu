/**
 * Badge trạng thái đơn hàng và thanh toán – có màu rõ ràng
 */
const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  paid: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Đã hủy', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  paid: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  failed: { label: 'Thất bại', className: 'bg-red-100 text-red-800 border-red-200' },
  refunded: { label: 'Đã hoàn tiền', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function OrderStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export function PaymentStatusBadge({ status }) {
  const config = PAYMENT_STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG, PAYMENT_STATUS_CONFIG };
