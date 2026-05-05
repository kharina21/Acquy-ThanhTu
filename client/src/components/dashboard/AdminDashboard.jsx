import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
    DollarSign,
    Users,
    Package,
    TrendingUp,
    TrendingDown,
    FileText,
    ChevronRight,
    RotateCw,
    ShoppingCart,
    BarChart3,
    PieChart,
    Activity,
    Truck,
    UserPlus,
    Receipt,
    CreditCard,
    Smartphone,
    Package2,
    RefreshCw,
    ShieldCheck,
    ClipboardList,
    PlusSquare,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart as RechartsPie,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { useBranchStore } from '@/stores/useBranchStore';
import { getDashboardStats, getDashboardChartData } from '@/services/dashboardService';
import { formatVND } from '@/lib/utils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];

const formatCurrency = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
};

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, colorClass = 'text-primary', bgClass = 'bg-primary/10' }) => (
    <div className="bg-base-100 rounded-xl p-4 border border-base-200 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
                <p className="text-sm text-base-content/60 font-medium truncate">{title}</p>
                <p className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</p>
                {subtitle && <p className="text-xs text-base-content/50 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-2.5 rounded-lg ${bgClass} ${colorClass} shrink-0`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-success' : 'text-error'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="font-medium">{Math.abs(trend)}%</span>
                <span className="text-base-content/40">kỳ trước</span>
            </div>
        )}
    </div>
);

// Thao tác nhanh
const QuickActions = () => (
    <div className="bg-base-100 rounded-xl p-4 border border-base-200">
        <div className="flex items-center justify-between mb-3">
            <div>
                <h3 className="font-semibold text-base-content text-sm">Thao tác nhanh</h3>
                <p className="text-xs text-base-content/50">Chức năng thường dùng</p>
            </div>
            <BarChart3 className="w-4 h-4 text-base-content/40" />
        </div>
        <div className="grid grid-cols-4 gap-2">
            <Link
                to="/sales"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Tạo đơn</span>
            </Link>
            <Link
                to="/admin/orders/invoices"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-secondary/5 hover:border-secondary/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                    <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Quản lý đơn</span>
            </Link>
            <Link
                to="/admin/warehouses/import"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-success/5 hover:border-success/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-success/10 text-success">
                    <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Nhập kho</span>
            </Link>
            <Link
                to="/admin/warehouses/nxt-report"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-info/5 hover:border-info/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-info/10 text-info">
                    <Activity className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Báo cáo NXT</span>
            </Link>
            {/* Hàng 2 - Thêm mới */}
            <Link
                to="/admin/battery-trade-in/create"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-warning/5 hover:border-warning/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                    <RefreshCw className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">Thu cũ</span>
            </Link>
            <Link
                to="/admin/warranties"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-error/5 hover:border-error/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-error/10 text-error">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">Bảo hành</span>
            </Link>
            <Link
                to="/admin/warehouses/stock-check"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-accent/5 hover:border-accent/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <ClipboardList className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">Kiểm kho</span>
            </Link>
            <Link
                to="/admin/products"
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-base-200 hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <PlusSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">Thêm SP</span>
            </Link>
        </div>
    </div>
);

// Biểu đồ doanh thu theo ngày
const DailyRevenueChart = ({ data, period }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.map((item) => ({
            name: item.label || item.date,
            doanhThu: item.revenue || 0,
            thuCu: item.batteryTradeIn || 0,
        }));
    }, [data]);

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Doanh thu theo ngày</h3>
                    <p className="text-xs text-base-content/50">
                        {period === 'week' ? '7 ngày gần nhất' : 'Trong tháng'}
                    </p>
                </div>
                <BarChart3 className="w-4 h-4 text-base-content/40" />
            </div>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <Tooltip
                            formatter={(value) => [formatVND(value), 'Doanh thu']}
                            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        />
                        <Bar dataKey="doanhThu" fill="#6366f1" radius={[4, 4, 0, 0]} name="Doanh thu" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[220px] flex items-center justify-center text-base-content/40 text-sm">
                    Chưa có dữ liệu
                </div>
            )}
        </div>
    );
};

// Biểu đồ phân bổ theo loại hóa đơn
const InvoiceDistributionChart = ({ data }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.map((item, index) => ({
            name: item.name,
            value: item.value || 0,
            count: item.count || 0,
            color: COLORS[index % COLORS.length],
        }));
    }, [data]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    const getIcon = (name) => {
        if (name === 'Bán POS') return CreditCard;
        if (name === 'Thu cũ') return RotateCw;
        if (name === 'Bán Online') return Smartphone;
        return Receipt;
    };

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Phân bổ theo loại hóa đơn</h3>
                    <p className="text-xs text-base-content/50">Theo nguồn doanh thu</p>
                </div>
                <PieChart className="w-4 h-4 text-base-content/40" />
            </div>
            {chartData.length > 0 ? (
                <div className="flex items-center gap-3">
                    <ResponsiveContainer width="45%" height={150}>
                        <RechartsPie>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={60}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => [formatVND(value), 'Doanh thu']}
                                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                            />
                        </RechartsPie>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                        {chartData.map((item, index) => {
                            const Icon = getIcon(item.name);
                            return (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs text-base-content/70">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-medium">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="h-[150px] flex items-center justify-center text-base-content/40 text-sm">
                    Chưa có dữ liệu
                </div>
            )}
        </div>
    );
};

const AdminDashboard = () => {
    const { currentLocationId, locations } = useBranchStore();
    const currentLocation = locations?.find((l) => l._id === currentLocationId);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [stats, setStats] = useState({
        revenue: { total: 0, period: '', changePercent: 0 },
        paidOrderCount: 0,
        pendingCount: 0,
        totalCustomers: 0,
        totalProducts: 0,
        topCustomers: [],
        topProducts: [],
    });
    const [chartData, setChartData] = useState({ dailyRevenue: [], invoiceDistribution: [] });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = {
                    period,
                    locationId: currentLocationId && currentLocationId !== 'all' ? currentLocationId : undefined,
                };
                const [statsData, chartRes] = await Promise.all([
                    getDashboardStats(params),
                    getDashboardChartData(params),
                ]);
                console.log('[Dashboard Chart Data]', period, chartRes);
                setStats(statsData);
                setChartData(chartRes || { dailyRevenue: [], invoiceDistribution: [] });
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period, currentLocationId]);

    const { revenue, paidOrderCount, pendingCount, totalCustomers, totalProducts, topCustomers, topProducts } = stats;
    const grossSales = revenue?.grossSales ?? revenue?.revenueOrders ?? 0;
    const tradeInExpense = revenue?.tradeInExpense ?? revenue?.revenueBatteryTradeIn ?? 0;
    const netSales = revenue?.netSales ?? (grossSales - tradeInExpense);

    if (loading && !stats.revenue?.period) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 sm:p-6 bg-base-200 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-base-content flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-primary" />
                            Tổng quan Dashboard
                        </h1>
                        {currentLocationId && currentLocationId !== 'all' && currentLocation ? (
                            <p className="text-sm text-base-content/70 mt-0.5">
                                Chi nhánh: {currentLocation.code} - {currentLocation.name}
                            </p>
                        ) : (
                            <p className="text-sm text-base-content/70 mt-0.5">Tất cả chi nhánh</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="join shadow-sm">
                            <button
                                type="button"
                                className={`join-item btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                                onClick={() => setPeriod('week')}
                            >
                                Tuần này
                            </button>
                            <button
                                type="button"
                                className={`join-item btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                                onClick={() => setPeriod('month')}
                            >
                                Tháng này
                            </button>
                        </div>
                    </div>
                </div>

                {/* THAO TÁC NHANH - Đặt lên trên cùng */}
                <QuickActions />

                {/* Revenue Main Card - Chỉ giữ lại 1 ô */}
                <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
                    <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-base-content/70">
                                        Doanh thu thuần ({revenue?.period || 'tháng này'})
                                    </p>
                                    <p className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-0.5">
                                        {formatVND(netSales || 0)}
                                    </p>
                                    <p className="text-xs text-base-content/50 mt-1">
                                        Bán hàng: {formatVND(grossSales || 0)} | Thu cũ: {formatVND(tradeInExpense || 0)}
                                    </p>
                                </div>
                            </div>
                            {revenue?.changePercent != null && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-base-200/80 self-start">
                                    {revenue.changePercent >= 0 ? (
                                        <TrendingUp className="w-4 h-4 text-success" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-error" />
                                    )}
                                    <span className={`text-sm font-semibold ${revenue.changePercent >= 0 ? 'text-success' : 'text-error'}`}>
                                        {revenue.changePercent >= 0 ? '+' : ''}
                                        {revenue.changePercent}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        title="Đơn đã TT"
                        value={paidOrderCount || 0}
                        subtitle="Kỳ này"
                        icon={Receipt}
                        trend={8}
                        colorClass="text-success"
                        bgClass="bg-success/10"
                    />
                    <StatCard
                        title="Khách hàng"
                        value={totalCustomers || 0}
                        subtitle="Tổng KH"
                        icon={Users}
                        trend={12}
                        colorClass="text-info"
                        bgClass="bg-info/10"
                    />
                    <StatCard
                        title="Sản phẩm"
                        value={totalProducts || 0}
                        subtitle="Trong kho"
                        icon={Package}
                        trend={-2}
                        colorClass="text-secondary"
                        bgClass="bg-secondary/10"
                    />
                    <StatCard
                        title="Đơn chờ"
                        value={pendingCount || 0}
                        subtitle="Cần xử lý"
                        icon={RotateCw}
                        colorClass="text-warning"
                        bgClass="bg-warning/10"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <DailyRevenueChart data={chartData.dailyRevenue} period={period} />
                    <InvoiceDistributionChart data={chartData.invoiceDistribution} />
                    <div className="bg-base-100 rounded-xl p-4 border border-base-200">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-base-content text-sm">Phân bổ doanh thu</h3>
                                <p className="text-xs text-base-content/50">So với kỳ trước</p>
                            </div>
                            <Activity className="w-4 h-4 text-base-content/40" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-base-content/60">Bán hàng</span>
                                <span className="text-sm font-medium">{formatVND(grossSales || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-base-content/60">Thu cũ</span>
                                <span className="text-sm font-medium text-warning">-{formatVND(tradeInExpense || 0)}</span>
                            </div>
                            <div className="divider my-1"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">Doanh thu thuần</span>
                                <span className="text-sm font-bold text-primary">{formatVND(netSales || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-base-100 rounded-xl p-4 border border-base-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Package2 className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-sm">Hàng bán chạy</h2>
                        </div>
                        <Link to="/admin/products" className="btn btn-ghost btn-xs">
                            Xem tất cả <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {topProducts && topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr className="text-xs">
                                        <th>#</th>
                                        <th>Sản phẩm</th>
                                        <th className="text-right">Đã bán</th>
                                        <th className="text-right">Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.slice(0, 5).map((p) => (
                                        <tr key={p.rank}>
                                            <td className="font-medium text-sm">{p.rank}</td>
                                            <td>
                                                <div className="font-medium text-sm">{p.name}</div>
                                                <div className="text-xs text-base-content/50">{p.sku}</div>
                                            </td>
                                            <td className="text-right text-sm">{p.quantitySold || 0}</td>
                                            <td className="text-right text-sm font-medium">{formatVND(p.revenue || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-base-content/40 text-sm">
                            Chưa có dữ liệu sản phẩm bán chạy
                        </div>
                    )}
                </div>

                {/* Top Customers */}
                <div className="bg-base-100 rounded-xl p-4 border border-base-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-semibold text-sm">Top khách hàng VIP</h2>
                        </div>
                        <Link to="/admin/customers" className="btn btn-ghost btn-xs">
                            Xem tất cả <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {topCustomers && topCustomers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr className="text-xs">
                                        <th className="w-8">#</th>
                                        <th>Khách hàng</th>
                                        <th className="text-right">Đơn hàng</th>
                                        <th className="text-right">Tổng chi tiêu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topCustomers.slice(0, 5).map((c) => (
                                        <tr key={c.rank}>
                                            <td className="font-medium text-sm">{c.rank}</td>
                                            <td>
                                                <div className="font-medium text-sm">{c.name}</div>
                                                <div className="text-xs text-base-content/50">{c.email}</div>
                                            </td>
                                            <td className="text-right text-sm">{c.orderCount || 0}</td>
                                            <td className="text-right text-sm font-medium">{formatVND(c.totalSpent || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-base-content/40 text-sm">
                            Chưa có dữ liệu khách hàng VIP
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
