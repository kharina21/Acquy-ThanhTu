import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getOrderById, updateOrder, syncPaymentStatus } from '@/services/orderService';
import { toast } from 'sonner';

const STATUS_LABELS = {
    pending: 'Chờ xử lý',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

const PAYMENT_STATUS_LABELS = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
    refunded: 'Đã hoàn tiền',
};

export default function AdminOrderDetailPage() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const fetchOrder = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getOrderById(id);
            setOrder(res?.data?.order);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tìm thấy đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleUpdate = async (field, value) => {
        if (!id) return;
        setUpdating(true);
        try {
            const payload = field === 'status' ? { status: value } : { paymentStatus: value };
            await updateOrder(id, payload);
            toast.success('Cập nhật thành công');
            fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdating(false);
        }
    };

    const handleSyncPayOS = async () => {
        if (!id) return;
        setSyncing(true);
        try {
            const res = await syncPaymentStatus(id);
            setOrder(res?.data?.order || order);
            toast.success('Đã đồng bộ trạng thái từ PayOS');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể đồng bộ từ PayOS');
        } finally {
            setSyncing(false);
        }
    };

    const formatCustomer = (order) => {
        if (order?.customerProfile) {
            return order.customerProfile.name + (order.customerProfile.phone ? ` (${order.customerProfile.phone})` : '');
        }
        const c = order?.customer;
        if (!c) return '—';
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username;
        return name || c.email || '—';
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link
                        to={order?.isPreOrder ? '/admin/orders/pre-orders' : '/admin/orders/invoices'}
                        className="btn btn-ghost btn-sm gap-1"
                    >
                        ← Quay lại
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : !order ? (
                    <div className="text-center py-12 text-base-content/60">
                        Không tìm thấy đơn hàng
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold">
                            Đơn hàng {order.code}
                            {order.isPreOrder && (
                                <span className="ml-2 badge badge-ghost">Đặt trước</span>
                            )}
                        </h1>

                        <div className="bg-base-100 rounded-lg border border-base-300 p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Khách hàng</span>
                                <span>{formatCustomer(order)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Chi nhánh</span>
                                <span>{order.location?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Trạng thái</span>
                                <select
                                    className="select select-bordered select-sm"
                                    value={['paid', 'confirmed'].includes(order.status) ? 'completed' : (order.status || 'pending')}
                                    onChange={(e) => handleUpdate('status', e.target.value)}
                                    disabled={updating}
                                >
                                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-base-content/70">Thanh toán</span>
                                <div className="flex items-center gap-1">
                                    <select
                                        className="select select-bordered select-sm"
                                        value={order.paymentStatus || 'pending'}
                                        onChange={(e) => handleUpdate('paymentStatus', e.target.value)}
                                        disabled={updating}
                                    >
                                        {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                            <option key={v} value={v}>{l}</option>
                                        ))}
                                    </select>
                                    {order.paymentStatus === 'pending' && ['vietqr', 'transfer'].includes(order.paymentMethod) && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            title="Đồng bộ trạng thái từ PayOS"
                                            onClick={handleSyncPayOS}
                                            disabled={syncing}
                                        >
                                            {syncing ? <span className="loading loading-spinner loading-sm" /> : '↻ Đồng bộ'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Địa chỉ giao hàng</span>
                                <span>{order.shippingAddress || '—'}</span>
                            </div>
                            {order.shippingPhone && (
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">SĐT nhận hàng</span>
                                    <span>{order.shippingPhone}</span>
                                </div>
                            )}
                            {order.note && (
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Ghi chú</span>
                                    <span>{order.note}</span>
                                </div>
                            )}
                            {order.status === 'cancelled' && (order.refundBankName || order.refundBankAccount || order.refundAccountHolder) && (
                                <>
                                    <div className="pt-2 mt-2 border-t border-base-300">
                                        <p className="text-sm font-medium text-base-content/70 mb-2">Thông tin hoàn tiền (khách hủy đơn đã thanh toán)</p>
                                        <div className="space-y-1 text-sm">
                                            {order.refundBankName && <p><span className="text-base-content/60">Ngân hàng:</span> {order.refundBankName}</p>}
                                            {order.refundBankAccount && <p><span className="text-base-content/60">Số TK:</span> {order.refundBankAccount}</p>}
                                            {order.refundAccountHolder && <p><span className="text-base-content/60">Chủ TK:</span> {order.refundAccountHolder}</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
                            <h2 className="px-4 py-3 font-semibold bg-base-200 border-b">
                                Chi tiết sản phẩm
                            </h2>
                            <div className="divide-y divide-base-200">
                                {order.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center px-4 py-3"
                                    >
                                        <div>
                                            <p className="font-medium">{item.product?.name || 'Sản phẩm'}</p>
                                            <p className="text-sm text-base-content/60">
                                                {item.quantity} x {(item.price || 0).toLocaleString()}đ
                                            </p>
                                        </div>
                                        <p className="font-medium">
                                            {((item.quantity || 0) * (item.price || 0)).toLocaleString()}đ
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 bg-base-200 border-t flex justify-between font-bold text-lg">
                                <span>Tổng tiền</span>
                                <span className="text-primary">
                                    {(order.totalAmount || 0).toLocaleString()}đ
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
