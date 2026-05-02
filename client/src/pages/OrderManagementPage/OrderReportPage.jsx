import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
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
    const location = useLocation();
    const { currentLocationId, locations } = useBranchStore();
    const currentLocation = locations?.find((l) => l._id === currentLocationId);
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({
        grossSales: 0,
        tradeInExpense: 0,
        tradeInSaleIncome: 0,
        netSales: 0,
        totalOrders: 0,
        revenueOrders: 0,
        revenueBatteryTradeIn: 0,
        revenueBatterySale: 0,
        batteryTradeInCount: 0,
    });
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
            if (currentLocationId && currentLocationId !== 'all') {
                params.locationId = currentLocationId;
            }
            const res = await getOrderReport(params);
            const data = res?.data;
            setItems(data?.items ?? data?.orders ?? []);
            setSummary(
                data?.summary || {
                    grossSales: 0,
                    tradeInExpense: 0,
                    tradeInSaleIncome: 0,
                    netSales: 0,
                    totalOrders: 0,
                    revenueOrders: 0,
                    revenueBatteryTradeIn: 0,
                    revenueBatterySale: 0,
                    batteryTradeInCount: 0,
                }
            );
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

    const getRowCode = (row) => {
        if (row.type === 'battery_trade_in') {
            // Nếu đã bán cho nhà máy → hiển thị mã bán
            if (row.saleInfo?.sold && row.saleInfo?.saleCode) {
                return row.saleInfo.saleCode;
            }
            return row.requestCode || String(row._id).slice(-8);
        }
        return row.code;
    };

    const getRowCustomer = (row) => {
        if (row.type === 'battery_trade_in') return row.name || row.email || '—';
        return getCustomerName(row);
    };

    const getRowDate = (row) => {
        if (row.type === 'battery_trade_in') return formatDate(row.completedAt || row.createdAt);
        return formatDate(row.createdAt);
    };

    const getRowAmount = (row) => {
        if (row.type === 'battery_trade_in') {
            // Nếu đã bán cho nhà máy → hiển thị tiền thu vào
            if (row.saleInfo?.sold && row.saleInfo?.saleTotalAmount > 0) {
                return row.saleInfo.saleTotalAmount;
            }
            return -(row.completedAmount ?? 0);
        }
        return row.totalAmount;
    };

    const grossSales = summary.grossSales ?? summary.revenueOrders ?? 0;
    const tradeInExpense = summary.tradeInExpense ?? summary.revenueBatteryTradeIn ?? 0;
    const tradeInSaleIncome = summary.tradeInSaleIncome ?? summary.revenueBatterySale ?? 0;
    const netSales = summary.netSales ?? summary.totalRevenue ?? (grossSales - tradeInExpense + tradeInSaleIncome);

    const getRowLocation = (row) => {
        if (row.type === 'battery_trade_in') return row.locationId?.name || row.locationId?.code || '—';
        return row.location?.name || row.location?.code || '—';
    };

    const getDetailTo = (row) => {
        if (row.type === 'battery_trade_in') return `/admin/battery-trade-in?detail=${row._id}`;
        const returnTo = encodeURIComponent(`${location.pathname}${location.search || ''}`);
        return `/admin/orders/${row._id}?returnTo=${returnTo}`;
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold text-base-content">Báo cáo doanh thu</h1>
                </div>

                <p className="text-base-content/70 mb-6">
                    Thống kê theo mô hình chuẩn: doanh thu bán hàng, chi thu cũ đổi mới và doanh thu thuần (trong kỳ lọc).
                    {currentLocation && (
                        <span className="block mt-1 font-medium text-primary">
                            Đang xem: {currentLocation.code} - {currentLocation.name}
                        </span>
                    )}
                </p>

                {/* Tổng quan */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <DollarSign className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Doanh thu thuần</div>
                            <div className="stat-value text-primary">{formatVND(netSales)}</div>
                            <div className="stat-desc">Bán hàng - chi thu cũ + thu bán</div>
                        </div>
                    </div>
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-info">
                                <DollarSign className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Doanh thu bán hàng</div>
                            <div className="stat-value text-info">{formatVND(grossSales)}</div>
                            <div className="stat-desc">Đơn đã thanh toán</div>
                        </div>
                    </div>
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-secondary">
                                <FileText className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Đơn hàng (đã TT)</div>
                            <div className="stat-value text-secondary">{summary.totalOrders}</div>
                            <div className="stat-desc">{formatVND(summary.revenueOrders ?? 0)}</div>
                        </div>
                    </div>
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-accent">
                                <BarChart3 className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Thu cũ hoàn thành</div>
                            <div className="stat-value text-accent">{summary.batteryTradeInCount ?? 0}</div>
                            <div className="stat-desc">-{formatVND(tradeInExpense)}</div>
                        </div>
                    </div>
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-success">
                                <BarChart3 className="w-10 h-10" />
                            </div>
                            <div className="stat-title">Bán acquy thu cũ</div>
                            <div className="stat-value text-success">{summary.batteryTradeInCount ?? 0}</div>
                            <div className="stat-desc">+{formatVND(tradeInSaleIncome)}</div>
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

                {/* Bảng giao dịch */}
                <div className="bg-base-100 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-base-200">
                        <h2 className="font-semibold">Danh sách giao dịch</h2>
                        <p className="text-sm text-base-content/60 mt-1">
                            Đơn hàng đã thanh toán và đơn thu cũ đã hoàn thành thu mua — sắp xếp theo thời gian mới nhất.
                        </p>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">
                            <p>Chưa có giao dịch nào trong khoảng thời gian này</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Mã</th>
                                            <th>Khách hàng</th>
                                            <th>Ngày</th>
                                            <th>Chi nhánh</th>
                                            <th className="text-right">Giá trị (+/-)</th>
                                            <th className="w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row) => (
                                            <tr key={`${row.type}-${row._id}`}>
                                                <td>
                                                    {row.type === 'battery_trade_in' ? (
                                                        row.saleInfo?.sold ? (
                                                            <span className="badge badge-success badge-sm whitespace-nowrap">
                                                                Bán acquy cũ
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-accent badge-sm whitespace-nowrap">
                                                                Thu cũ
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                                                            Đơn hàng
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="font-medium">
                                                    <Link
                                                        to={getDetailTo(row)}
                                                        className="link link-primary hover:underline"
                                                    >
                                                        {getRowCode(row)}
                                                    </Link>
                                                </td>
                                                <td>{getRowCustomer(row)}</td>
                                                <td>{getRowDate(row)}</td>
                                                <td>{getRowLocation(row)}</td>
                                                <td
                                                    className={`text-right font-medium ${
                                                        row.type === 'battery_trade_in' && !row.saleInfo?.sold
                                                            ? 'text-error'
                                                            : row.saleInfo?.sold
                                                            ? 'text-success'
                                                            : 'text-primary'
                                                    }`}
                                                >
                                                    {row.type === 'battery_trade_in' && !row.saleInfo?.sold
                                                        ? `-${formatVND(Math.abs(getRowAmount(row)))}`
                                                        : formatVND(getRowAmount(row))}
                                                </td>
                                                <td>
                                                    <Link
                                                        to={getDetailTo(row)}
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
                                        Trang {pagination.page} / {pagination.totalPages} ({pagination.total} giao dịch)
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
