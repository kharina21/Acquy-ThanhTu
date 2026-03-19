import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getOrderById, updateOrder } from '@/services/orderService';
import { toast } from 'sonner';

const STATUS_LABELS = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    paid: 'Đã thanh toán',
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
                                    value={order.status || 'pending'}
                                    onChange={(e) => handleUpdate('status', e.target.value)}
                                    disabled={updating}
                                >
                                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Thanh toán</span>
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
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Địa chỉ giao hàng</span>
                                <span>{order.shippingAddress || '—'}</span>
                            </div>
                            {order.note && (
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Ghi chú</span>
                                    <span>{order.note}</span>
                                </div>
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
