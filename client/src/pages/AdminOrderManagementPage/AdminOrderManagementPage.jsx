import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';
import { getActiveLocations } from '@/services/locationService';
import { getMyOrders, updateOrder } from '@/services/orderService';
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

export default function AdminOrderManagementPage({ type = 'invoices' }) {
    const { currentLocationId, setCurrentLocationId } = useBranchStore();
    const [locations, setLocations] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', paymentStatus: '' });
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        getActiveLocations()
            .then((res) => setLocations(res?.data?.locations || []))
            .catch(() => setLocations([]));
    }, []);

    useEffect(() => {
        if (locations.length > 0 && !currentLocationId) {
            setCurrentLocationId(locations[0]._id);
        }
    }, [locations, currentLocationId, setCurrentLocationId]);

    const fetchOrders = async () => {
        if (!currentLocationId) {
            setOrders([]);
            return;
        }
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, locationId: currentLocationId };
            if (filters.status) params.status = filters.status;
            if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
            if (type === 'pre-orders') params.isPreOrder = true;
            if (type === 'invoices') params.isPreOrder = false;
            const res = await getMyOrders(params);
            const data = res?.data;
            const pag = data?.pagination || {};
            setOrders(data?.orders || []);
            setPagination((p) => ({
                ...p,
                page: pag.page ?? p.page,
                total: pag.total ?? p.total,
                totalPages: Math.max(1, pag.totalPages ?? p.totalPages),
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [pagination.page, filters.status, filters.paymentStatus, currentLocationId, type]);

    const handleUpdateStatus = async (orderId, field, value) => {
        setUpdatingId(orderId);
        try {
            const payload = field === 'status' ? { status: value } : { paymentStatus: value };
            await updateOrder(orderId, payload);
            toast.success('Cập nhật thành công');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
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
            <div className="container mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-base-content">
                    {type === 'pre-orders' ? 'Đặt hàng' : type === 'invoices' ? 'Hóa đơn' : 'Quản lý đơn hàng'}
                </h1>

                <div className="flex flex-wrap gap-2 items-center">
                    <div>
                        <label className="label py-0 text-xs">Cơ sở</label>
                        <select
                            className="select select-bordered select-sm w-48"
                            value={currentLocationId || ''}
                            onChange={(e) => setCurrentLocationId(e.target.value || null)}
                        >
                            <option value="">-- Chọn cơ sở --</option>
                            {locations.map((loc) => (
                                <option key={loc._id} value={loc._id}>
                                    {loc.name || loc.code}
                                </option>
                            ))}
                        </select>
                    </div>
                    <select
                        className="select select-bordered select-sm w-40"
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </select>
                    <select
                        className="select select-bordered select-sm w-40"
                        value={filters.paymentStatus}
                        onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
                    >
                        <option value="">Tất cả thanh toán</option>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-base-100 rounded-lg shadow-lg">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-12 text-center text-base-content/60">
                            {!currentLocationId
                                ? 'Vui lòng chọn cơ sở'
                                : 'Chưa có đơn hàng nào tại cơ sở này'}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                                <table className="table">
                                    <thead className="bg-blue-100 sticky top-0 z-20 border-b-2 border-base-300">
                                        <tr>
                                            <th className="w-8 py-3"></th>
                                            <th className="font-medium text-neutral text-xs py-3">Mã đơn</th>
                                            <th className="font-medium text-neutral text-xs py-3">Khách hàng</th>
                                            <th className="font-medium text-neutral text-xs py-3">Chi nhánh</th>
                                            <th className="font-medium text-neutral text-xs py-3">Tổng tiền</th>
                                            <th className="font-medium text-neutral text-xs py-3">Trạng thái</th>
                                            <th className="font-medium text-neutral text-xs py-3">Thanh toán</th>
                                            <th className="font-medium text-neutral text-xs py-3">Ngày tạo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {orders.map((order) => {
                                            const isExpanded = expandedId === order._id;
                                            return (
                                                <React.Fragment key={order._id}>
                                                    <tr
                                                        className={`cursor-pointer hover:bg-base-200/60 transition-colors font-light ${isExpanded ? 'bg-primary/10' : ''}`}
                                                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                                                    >
                                                        <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </td>
                                                        <td className="py-3">
                                                            <span className="font-mono font-medium">{order.code}</span>
                                                            {order.isPreOrder && (
                                                                <span className="ml-1 badge badge-sm badge-ghost">Đặt trước</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3">{formatCustomer(order)}</td>
                                                        <td className="py-3">{order.location?.name || '—'}</td>
                                                        <td className="font-semibold text-primary py-3">
                                                            {(order.totalAmount || 0).toLocaleString()}đ
                                                        </td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                className="select select-bordered select-sm"
                                                                value={order.status || 'pending'}
                                                                onChange={(e) =>
                                                                    handleUpdateStatus(order._id, 'status', e.target.value)
                                                                }
                                                                disabled={updatingId === order._id}
                                                            >
                                                                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                                                    <option key={v} value={v}>{l}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                className="select select-bordered select-sm"
                                                                value={order.paymentStatus || 'pending'}
                                                                onChange={(e) =>
                                                                    handleUpdateStatus(order._id, 'paymentStatus', e.target.value)
                                                                }
                                                                disabled={updatingId === order._id}
                                                            >
                                                                {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                                                    <option key={v} value={v}>{l}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="text-base-content/70 py-3">
                                                            {order.createdAt
                                                                ? new Date(order.createdAt).toLocaleString('vi-VN')
                                                                : '—'}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr key={`${order._id}-detail`} className="bg-primary/5 border-b-2 border-base-300">
                                                            <td colSpan={8} className="p-4 border-l-4 border-l-primary align-top" onClick={(e) => e.stopPropagation()}>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <p><span className="font-medium text-base-content/70">Khách hàng:</span> {formatCustomer(order)}</p>
                                                                        <p><span className="font-medium text-base-content/70">Chi nhánh:</span> {order.location?.name || '—'}</p>
                                                                        <p><span className="font-medium text-base-content/70">Địa chỉ giao hàng:</span> {order.shippingAddress || '—'}</p>
                                                                        {order.shippingPhone && (
                                                                            <p><span className="font-medium text-base-content/70">SĐT nhận hàng:</span> {order.shippingPhone}</p>
                                                                        )}
                                                                        {order.note && (
                                                                            <p><span className="font-medium text-base-content/70">Ghi chú:</span> {order.note}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p><span className="font-medium text-base-content/70">Trạng thái:</span> {STATUS_LABELS[order.status] || order.status}</p>
                                                                        <p><span className="font-medium text-base-content/70">Thanh toán:</span> {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-4 pt-4 border-t border-base-200">
                                                                    <p className="font-medium text-base-content/70 mb-2">Chi tiết sản phẩm</p>
                                                                    <div className="divide-y divide-base-200">
                                                                        {order.items?.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between py-2">
                                                                                <span>{item.product?.name || 'Sản phẩm'} × {item.quantity}</span>
                                                                                <span className="font-medium">
                                                                                    {((item.quantity || 0) * (item.price || 0)).toLocaleString()}đ
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex justify-between font-bold text-primary pt-2 mt-2 border-t border-base-200">
                                                                        <span>Tổng tiền</span>
                                                                        <span>{(order.totalAmount || 0).toLocaleString()}đ</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center p-4 border-t border-base-200">
                                <p className="text-sm text-base-content/60">
                                    Hiển thị {orders.length} / {pagination.total} đơn hàng
                                </p>
                                <div className="join">
                                    <button
                                        type="button"
                                        className="join-item btn btn-sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() =>
                                            setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                                        }
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button type="button" className="join-item btn btn-sm" disabled>
                                        Trang {pagination.page} / {pagination.totalPages}
                                    </button>
                                    <button
                                        type="button"
                                        className="join-item btn btn-sm"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() =>
                                            setPagination((p) => ({
                                                ...p,
                                                page: Math.min(p.totalPages, p.page + 1),
                                            }))
                                        }
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
