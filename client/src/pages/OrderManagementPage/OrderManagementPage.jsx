import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getMyOrders, updateOrder } from '@/services/orderService';
import { toast } from 'sonner';
import { ShoppingCart, CheckCircle, Banknote, ChevronRight } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge, STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/components/order/StatusBadge';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const OrderManagementPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPayment, setFilterPayment] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    const fetchOrders = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (filterStatus) params.status = filterStatus;
            if (filterPayment) params.paymentStatus = filterPayment;
            const res = await getMyOrders(params);
            const data = res?.data;
            setOrders(data?.orders || []);
            setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(1);
    }, [filterStatus, filterPayment]);

    const handleConfirmOrder = async (order) => {
        if (order.status !== 'pending') return;
        setUpdatingId(order._id);
        try {
            const res = await updateOrder(order._id, { status: 'confirmed' });
            if (res.success) {
                toast.success('Đã xác nhận đơn hàng');
                fetchOrders(pagination.page);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi xác nhận đơn hàng');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleConfirmPayment = async (order) => {
        if (order.paymentStatus === 'paid') return;
        setUpdatingId(order._id);
        try {
            const res = await updateOrder(order._id, { paymentStatus: 'paid', status: 'paid' });
            if (res.success) {
                toast.success('Đã xác nhận thanh toán');
                fetchOrders(pagination.page);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi xác nhận thanh toán');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCancelOrder = async (order) => {
        if (order.status === 'cancelled') return;
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
        setUpdatingId(order._id);
        try {
            const res = await updateOrder(order._id, { status: 'cancelled' });
            if (res.success) {
                toast.success('Đã hủy đơn hàng');
                fetchOrders(pagination.page);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi hủy đơn hàng');
        } finally {
            setUpdatingId(null);
        }
    };

    const getCustomerName = (order) => {
        const c = order.customer;
        if (!c) return '—';
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
        return name || c.username || c.email || '—';
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <ShoppingCart className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold text-base-content">Quản lý đơn hàng</h1>
                </div>

                <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6">
                    <div className="flex flex-wrap gap-4 mb-6">
                        <select
                            className="select select-bordered w-48"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <select
                            className="select select-bordered w-48"
                            value={filterPayment}
                            onChange={(e) => setFilterPayment(e.target.value)}
                        >
                            <option value="">Tất cả thanh toán</option>
                            {Object.entries(PAYMENT_STATUS_CONFIG).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">
                            <p>Chưa có đơn hàng nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Khách hàng</th>
                                        <th>Ngày đặt</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Thanh toán</th>
                                        <th className="text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => {
                                        const isUpdating = updatingId === order._id;
                                        return (
                                            <tr key={order._id}>
                                                <td className="font-medium">
                                                    <Link
                                                        to={`/orders/${order._id}`}
                                                        className="link link-primary hover:underline"
                                                    >
                                                        {order.code}
                                                    </Link>
                                                </td>
                                                <td>{getCustomerName(order)}</td>
                                                <td>{formatDate(order.createdAt)}</td>
                                                <td className="font-medium text-primary">{formatVND(order.totalAmount)}</td>
                                                <td>
                                                    <OrderStatusBadge status={order.status} />
                                                </td>
                                                <td>
                                                    <PaymentStatusBadge status={order.paymentStatus} />
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {order.status === 'pending' && (
                                                            <button
                                                                className="btn btn-xs btn-primary gap-1"
                                                                onClick={() => handleConfirmOrder(order)}
                                                                disabled={isUpdating}
                                                                title="Xác nhận đơn hàng"
                                                            >
                                                                {isUpdating ? (
                                                                    <span className="loading loading-spinner loading-xs" />
                                                                ) : (
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                )}
                                                                Xác nhận
                                                            </button>
                                                        )}
                                                        {order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
                                                            <button
                                                                className="btn btn-xs btn-success gap-1"
                                                                onClick={() => handleConfirmPayment(order)}
                                                                disabled={isUpdating}
                                                                title="Xác nhận đã thanh toán"
                                                            >
                                                                {isUpdating ? (
                                                                    <span className="loading loading-spinner loading-xs" />
                                                                ) : (
                                                                    <Banknote className="w-3.5 h-3.5" />
                                                                )}
                                                                Đã thanh toán
                                                            </button>
                                                        )}
                                                        {order.status !== 'cancelled' && order.status === 'pending' && (
                                                            <button
                                                                className="btn btn-xs btn-outline btn-error"
                                                                onClick={() => handleCancelOrder(order)}
                                                                disabled={isUpdating}
                                                                title="Hủy đơn hàng"
                                                            >
                                                                Hủy
                                                            </button>
                                                        )}
                                                        <Link
                                                            to={`/orders/${order._id}`}
                                                            className="btn btn-xs btn-ghost gap-1"
                                                            title="Xem chi tiết"
                                                        >
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <button
                                className="btn btn-sm"
                                disabled={pagination.page <= 1}
                                onClick={() => fetchOrders(pagination.page - 1)}
                            >
                                Trước
                            </button>
                            <span className="flex items-center px-4 text-sm">
                                Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đơn)
                            </span>
                            <button
                                className="btn btn-sm"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchOrders(pagination.page + 1)}
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderManagementPage;
