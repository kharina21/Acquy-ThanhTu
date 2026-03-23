import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useBranchStore } from '@/stores/useBranchStore';
import { getOrderReport } from '@/services/orderService';
import { toast } from 'sonner';
import { BarChart3, DollarSign, FileText, ChevronRight } from 'lucide-react';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const OrderReportPage = () => {
    const { currentLocationId, locations } = useBranchStore();
    const currentLocation = locations?.find((l) => l._id === currentLocationId);
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0 });
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchReport = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;
            if (currentLocationId) params.locationId = currentLocationId;
            const res = await getOrderReport(params);
            const data = res?.data;
            setOrders(data?.orders || []);
            setSummary(data?.summary || { totalRevenue: 0, totalOrders: 0 });
            setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi tải báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(1);
    }, [dateFrom, dateTo, currentLocationId]);

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
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold text-base-content">Báo cáo đơn hàng</h1>
                </div>

                <p className="text-base-content/70 mb-6">
                    Thống kê doanh thu từ các đơn hàng đã được xác nhận và thanh toán thành công.
                    {currentLocation && (
                        <span className="block mt-1 font-medium text-primary">
                            Đang xem: {currentLocation.code} - {currentLocation.name}
                        </span>
                    )}
                </p>

                {/* Tổng quan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <DollarSign className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Tổng doanh thu</div>
                            <div className="stat-value text-primary">{formatVND(summary.totalRevenue)}</div>
                            <div className="stat-desc">Đơn đã xác nhận & thanh toán</div>
                        </div>
                    </div>
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-secondary">
                                <FileText className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Số đơn hàng</div>
                            <div className="stat-value text-secondary">{summary.totalOrders}</div>
                            <div className="stat-desc">Đơn đã hoàn thành</div>
                        </div>
                    </div>
                </div>

                {/* Bộ lọc */}
                <div className="bg-base-100 rounded-lg shadow p-6 mb-6">
                    <h2 className="font-semibold mb-4">Lọc theo thời gian</h2>
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="label">
                                <span className="label-text">Từ ngày</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label">
                                <span className="label-text">Đến ngày</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bảng đơn hàng */}
                <div className="bg-base-100 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-base-200">
                        <h2 className="font-semibold">Danh sách đơn hàng đã thanh toán</h2>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">
                            <p>Chưa có đơn hàng nào đã xác nhận và thanh toán trong khoảng thời gian này</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th>Mã đơn</th>
                                            <th>Khách hàng</th>
                                            <th>Ngày đặt</th>
                                            <th>Chi nhánh</th>
                                            <th className="text-right">Tổng tiền</th>
                                            <th className="w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order._id}>
                                                <td className="font-medium">
                                                    <Link
                                                        to={`/admin/orders/${order._id}`}
                                                        className="link link-primary hover:underline"
                                                    >
                                                        {order.code}
                                                    </Link>
                                                </td>
                                                <td>{getCustomerName(order)}</td>
                                                <td>{formatDate(order.createdAt)}</td>
                                                <td>{order.location?.name || order.location?.code || '—'}</td>
                                                <td className="text-right font-medium text-primary">
                                                    {formatVND(order.totalAmount)}
                                                </td>
                                                <td>
                                                    <Link
                                                        to={`/admin/orders/${order._id}`}
                                                        className="btn btn-ghost btn-xs"
                                                        title="Xem chi tiết"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="flex justify-center gap-2 py-4 border-t border-base-200">
                                    <button
                                        className="btn btn-sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() => fetchReport(pagination.page - 1)}
                                    >
                                        Trước
                                    </button>
                                    <span className="flex items-center px-4 text-sm">
                                        Trang {pagination.page} / {pagination.totalPages} ({pagination.total} đơn)
                                    </span>
                                    <button
                                        className="btn btn-sm"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() => fetchReport(pagination.page + 1)}
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderReportPage;
