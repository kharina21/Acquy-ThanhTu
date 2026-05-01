import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
    DollarSign,
    Users,
    Package,
    TrendingUp,
    TrendingDown,
    FileText,
    AlertCircle,
    ChevronRight,
    RotateCw,
    ShoppingCart,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    BarChart3,
    PieChart,
    Activity,
    Wrench,
    Truck,
    UserPlus,
    Receipt,
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
import { getDashboardStats } from '@/services/dashboardService';
import { formatVND } from '@/lib/utils';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

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

const RevenueBarChart = ({ data }) => {
    const chartData = useMemo(() => {
        return data?.map((item) => ({
            name: item.date || item.label || item.name,
            doanhThu: item.revenue || item.value || 0,
        })) || [];
    }, [data]);

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Doanh thu theo ngày</h3>
                    <p className="text-xs text-base-content/50">7 ngày gần nhất</p>
                </div>
                <BarChart3 className="w-4 h-4 text-base-content/40" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
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
        </div>
    );
};

const RevenueLineChart = ({ data }) => {
    const chartData = useMemo(() => {
        return data?.map((item) => ({
            name: item.date || item.label || item.name,
            doanhThu: item.revenue || item.value || 0,
            loiNhuan: item.profit || item.loiNhuan || 0,
        })) || [];
    }, [data]);

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Xu hướng doanh thu</h3>
                    <p className="text-xs text-base-content/50">30 ngày gần nhất</p>
                </div>
                <Activity className="w-4 h-4 text-base-content/40" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <Tooltip
                        formatter={(value) => formatVND(value)}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="doanhThu"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', r: 3 }}
                        name="Doanh thu"
                    />
                    {chartData[0]?.loiNhuan !== undefined && (
                        <Line
                            type="monotone"
                            dataKey="loiNhuan"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 3 }}
                            name="Lợi nhuận"
                        />
                    )}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const CategoryPieChart = ({ data }) => {
    const chartData = useMemo(() => {
        return data?.map((item, index) => ({
            name: item.category || item.name,
            value: item.value || item.revenue || 0,
            color: COLORS[index % COLORS.length],
        })) || [];
    }, [data]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Phân bổ doanh thu</h3>
                    <p className="text-xs text-base-content/50">Theo danh mục</p>
                </div>
                <PieChart className="w-4 h-4 text-base-content/40" />
            </div>
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
                <div className="flex-1 space-y-1.5">
                    {chartData.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-base-content/70 truncate max-w-[80px]">{item.name}</span>
                            </div>
                            <span className="font-medium text-[11px]">
                                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const OrderStatusMini = ({ data }) => {
    const stats = data || { pending: 0, completed: 0, cancelled: 0, processing: 0 };
    const items = [
        { key: 'pending', label: 'Chờ xử lý', value: stats.pending || 0, color: '#f59e0b', icon: Clock },
        { key: 'processing', label: 'Đang xử lý', value: stats.processing || 0, color: '#3b82f6', icon: Wrench },
        { key: 'completed', label: 'Hoàn thành', value: stats.completed || 0, color: '#10b981', icon: CheckCircle2 },
        { key: 'cancelled', label: 'Đã hủy', value: stats.cancelled || 0, color: '#ef4444', icon: XCircle },
    ].filter(item => item.value > 0);

    return (
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-base-content text-sm">Trạng thái đơn hàng</h3>
                    <p className="text-xs text-base-content/50">Tổng quan</p>
                </div>
                <Link to="/admin/orders/invoices" className="btn btn-ghost btn-xs">
                    Chi tiết <ChevronRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-base-200/50">
                            <div className="p-1.5 rounded-md" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                                <p className="text-[10px] text-base-content/60 truncate">{item.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const NotificationCard = ({ type, count, label, link, colorClass, bgClass, icon: Icon }) => (
    <Link
        to={link}
        className={`flex items-center gap-2 p-2.5 rounded-lg border ${bgClass} hover:scale-[1.02] transition-transform`}
    >
        <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-lg font-bold">{count}</p>
            <p className="text-xs text-base-content/60">{label}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-base-content/40" />
    </Link>
);

const AdminDashboard = () => {
    const { currentLocationId, locations } = useBranchStore();
    const currentLocation = locations?.find((l) => l._id === currentLocationId);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [stats, setStats] = useState({
        revenue: { total: 0, period: '', changePercent: 0 },
        ordersByStatus: { pending: 0, completed: 0, cancelled: 0, processing: 0 },
        paidOrderCount: 0,
        pendingCount: 0,
        totalCustomers: 0,
        totalProducts: 0,
        topCustomers: [],
        topProducts: [],
    });

    const [chartData] = useState({
        dailyRevenue: [
            { name: 'T2', doanhThu: 45000000 },
            { name: 'T3', doanhThu: 52000000 },
            { name: 'T4', doanhThu: 48000000 },
            { name: 'T5', doanhThu: 61000000 },
            { name: 'T6', doanhThu: 55000000 },
            { name: 'T7', doanhThu: 72000000 },
            { name: 'CN', doanhThu: 38000000 },
        ],
        monthlyRevenue: Array.from({ length: 12 }, (_, i) => ({
            name: `T${i + 1}`,
            doanhThu: Math.random() * 2000000000 + 500000000,
            loiNhuan: Math.random() * 400000000 + 100000000,
        })),
        categoryRevenue: [
            { name: 'Ắc quy xe máy', value: 450000000 },
            { name: 'Ắc quy ô tô', value: 680000000 },
            { name: 'Ắc quy xe tải', value: 320000000 },
            { name: 'Ắc quy công nghiệp', value: 180000000 },
            { name: 'Phụ kiện', value: 95000000 },
        ],
    });

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await getDashboardStats({
                    period,
                    locationId: currentLocationId && currentLocationId !== 'all' ? currentLocationId : undefined,
                });
                setStats(data);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [period, currentLocationId]);

    const { revenue, paidOrderCount, pendingCount, totalCustomers, totalProducts, topCustomers, topProducts, ordersByStatus } = stats;
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

    const mockNotifications = [
        { type: 'pending', count: pendingCount || 5, label: 'Đơn chờ xử lý', link: '/admin/orders/invoices?status=pending', colorClass: 'bg-warning/15 text-warning', bgClass: 'border-warning/25 hover:border-warning/40', icon: Clock },
        { type: 'low-stock', count: 12, label: 'Sản phẩm sắp hết', link: '/admin/warehouses/nxt-report', colorClass: 'bg-error/15 text-error', bgClass: 'border-error/25 hover:border-error/40', icon: Package },
        { type: 'trade-in', count: 3, label: 'Yêu cầu thu cũ', link: '/admin/battery-trade-in', colorClass: 'bg-accent/15 text-accent', bgClass: 'border-accent/25 hover:border-accent/40', icon: RotateCw },
        { type: 'new-customer', count: 8, label: 'Khách hàng mới', link: '/admin/customers', colorClass: 'bg-info/15 text-info', bgClass: 'border-info/25 hover:border-info/40', icon: UserPlus },
    ];

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

                {/* Notifications Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {mockNotifications.map((item) => (
                        <NotificationCard key={item.type} {...item} />
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard
                        title="Doanh thu thuần"
                        value={formatVND(netSales || 125000000)}
                        subtitle="Bán hàng - Thu cũ"
                        icon={DollarSign}
                        trend={revenue?.changePercent || 15}
                        colorClass="text-primary"
                        bgClass="bg-primary/10"
                    />
                    <StatCard
                        title="Đơn đã TT"
                        value={paidOrderCount || 47}
                        subtitle="Kỳ này"
                        icon={Receipt}
                        trend={8}
                        colorClass="text-success"
                        bgClass="bg-success/10"
                    />
                    <StatCard
                        title="Khách hàng"
                        value={totalCustomers || 128}
                        subtitle="Tổng KH"
                        icon={Users}
                        trend={12}
                        colorClass="text-info"
                        bgClass="bg-info/10"
                    />
                    <StatCard
                        title="Sản phẩm"
                        value={totalProducts || 156}
                        subtitle="Trong kho"
                        icon={Package}
                        trend={-2}
                        colorClass="text-secondary"
                        bgClass="bg-secondary/10"
                    />
                </div>

                {/* Revenue Main Card */}
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
                                        {formatVND(netSales || 125000000)}
                                    </p>
                                    <p className="text-xs text-base-content/50 mt-1">
                                        Bán hàng: {formatVND(grossSales || 135000000)} | Thu cũ: {formatVND(tradeInExpense || 10000000)}
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

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RevenueBarChart data={chartData.dailyRevenue} />
                    <RevenueLineChart data={chartData.monthlyRevenue} />
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <CategoryPieChart data={chartData.categoryRevenue} />
                    <OrderStatusMini data={ordersByStatus} />
                    <div className="bg-base-100 rounded-xl p-4 border border-base-200">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-base-content text-sm">Thao tác nhanh</h3>
                                <p className="text-xs text-base-content/50">Chức năng thường dùng</p>
                            </div>
                            <Eye className="w-4 h-4 text-base-content/40" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Link
                                to="/sales"
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
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium">Báo cáo NXT</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-base-100 rounded-xl p-4 border border-base-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-base-content text-sm">Top sản phẩm bán chạy</h3>
                            <p className="text-xs text-base-content/50">Theo số lượng bán ra</p>
                        </div>
                        <Link to="/admin/products" className="btn btn-ghost btn-xs">
                            Xem tất cả <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr className="text-xs">
                                    <th>#</th>
                                    <th>Sản phẩm</th>
                                    <th className="text-right">Đã bán</th>
                                    <th className="text-right">Tồn kho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(topProducts || [
                                    { rank: 1, name: 'Ắc quy GS 12V 7Ah', quantitySold: 45, stock: 23 },
                                    { rank: 2, name: 'Ắc quy Rocket 12V 9Ah', quantitySold: 38, stock: 15 },
                                    { rank: 3, name: 'Ắc quy Globe 12V 5Ah', quantitySold: 32, stock: 28 },
                                    { rank: 4, name: 'Ắc quy Fusion 12V 12Ah', quantitySold: 28, stock: 8 },
                                    { rank: 5, name: 'Ắc quy Panasonic 12V 8Ah', quantitySold: 25, stock: 19 },
                                ]).slice(0, 5).map((p) => (
                                    <tr key={p.rank}>
                                        <td className="font-medium text-sm">{p.rank}</td>
                                        <td className="text-sm">{p.name}</td>
                                        <td className="text-right text-sm">{p.quantitySold || p.quantitySold}</td>
                                        <td className={`text-right text-sm ${(p.stock || 10) < 10 ? 'text-error font-medium' : 'text-base-content/70'}`}>
                                            {p.stock || 10}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr className="text-xs">
                                    <th className="w-8">#</th>
                                    <th>Khách hàng</th>
                                    <th className="text-right">Đơn hàng</th>
                                    <th className="text-right">Tổng chi tiêu</th>
                                    <th className="text-center">Hạng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(topCustomers || [
                                    { rank: 1, name: 'Nguyễn Văn A', email: 'nva@email.com', orderCount: 12, totalSpent: 45000000, tier: 'VIP' },
                                    { rank: 2, name: 'Trần Thị B', email: 'ttb@email.com', orderCount: 8, totalSpent: 32000000, tier: 'VIP' },
                                    { rank: 3, name: 'Lê Văn C', email: 'lvc@email.com', orderCount: 6, totalSpent: 28000000, tier: 'Gold' },
                                ]).slice(0, 5).map((c) => (
                                    <tr key={c.rank}>
                                        <td className="font-medium text-sm">{c.rank}</td>
                                        <td>
                                            <div className="font-medium text-sm">{c.name}</div>
                                            <div className="text-xs text-base-content/50">{c.email}</div>
                                        </td>
                                        <td className="text-right text-sm">{c.orderCount}</td>
                                        <td className="text-right text-sm font-medium">{formatVND(c.totalSpent)}</td>
                                        <td className="text-center">
                                            <span className={`badge badge-sm ${c.tier === 'VIP' ? 'badge-error' : 'badge-warning'}`}>
                                                {c.tier}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
