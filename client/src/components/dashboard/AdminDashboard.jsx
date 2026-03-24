import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    DollarSign,
    Users,
    Package,
    TrendingUp,
    FileText,
    AlertCircle,
    ChevronRight,
    RotateCw,
    Store,
} from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';
import { getDashboardStats } from '@/services/dashboardService';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const AdminDashboard = () => {
    const { currentLocationId, locations } = useBranchStore();
    const currentLocation = locations?.find((l) => l._id === currentLocationId);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [stats, setStats] = useState({
        revenue: { total: 0, period: '', changePercent: 0 },
        ordersByStatus: { pending: 0, completed: 0, cancelled: 0 },
        pendingCount: 0,
        totalCustomers: 0,
        totalProducts: 0,
        topCustomers: [],
        topProducts: [],
    });

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const data = await getDashboardStats({
                period,
                locationId: currentLocationId && currentLocationId !== 'all' ? currentLocationId : undefined,
            });
            setStats(data);
            setLoading(false);
        };
        fetch();
    }, [period, currentLocationId]);

    if (loading && !stats.revenue?.period) {
        return (
            <div className='flex-1 flex items-center justify-center min-h-[50vh]'>
                <span className='loading loading-spinner loading-lg text-primary' />
            </div>
        );
    }

    const { revenue, paidOrderCount, pendingCount, totalCustomers, totalProducts, topCustomers, topProducts } = stats;

    const hasBreakdown =
        revenue?.revenueOrders != null ||
        revenue?.revenueBatteryTradeIn != null;

    return (
        <div className='flex-1 p-4 sm:p-6 bg-base-200 overflow-y-auto'>
            <div className='max-w-7xl mx-auto space-y-6'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div>
                        <h1 className='text-2xl font-bold text-base-content'>Tổng quan</h1>
                        {(currentLocationId && currentLocationId !== 'all' && currentLocation) ? (
                            <p className='text-sm text-base-content/70 mt-0.5'>
                                Chi nhánh: {currentLocation.code} - {currentLocation.name}
                            </p>
                        ) : (
                            <p className='text-sm text-base-content/70 mt-0.5'>Tất cả chi nhánh</p>
                        )}
                    </div>
                    <div className='join shadow-sm'>
                        <button
                            type='button'
                            className={`join-item btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                            onClick={() => setPeriod('week')}
                        >
                            Tuần này
                        </button>
                        <button
                            type='button'
                            className={`join-item btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                            onClick={() => setPeriod('month')}
                        >
                            Tháng này
                        </button>
                    </div>
                </div>

                {pendingCount > 0 && (
                    <Link
                        to='/admin/orders/invoices'
                        className='block p-4 rounded-xl bg-warning/15 border border-warning/30 hover:bg-warning/20 transition-colors'
                    >
                        <div className='flex items-center gap-3'>
                            <AlertCircle className='w-8 h-8 text-warning shrink-0' />
                            <div className='flex-1'>
                                <p className='font-semibold text-warning'>Đơn chờ xử lý</p>
                                <p className='text-sm text-base-content/70'>Có {pendingCount} đơn hàng cần xử lý</p>
                            </div>
                            <ChevronRight className='w-5 h-5 text-warning' />
                        </div>
                    </Link>
                )}

                {/* Doanh thu — tách bán hàng / thu cũ */}
                <div className='card bg-base-100 shadow-lg border border-base-200 overflow-hidden'>
                    <div className='p-5 sm:p-6'>
                        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
                            <div className='flex items-start gap-3'>
                                <div className='p-3 rounded-xl bg-primary/10 text-primary shrink-0'>
                                    <DollarSign className='w-7 h-7' />
                                </div>
                                <div>
                                    <p className='text-sm font-medium text-base-content/70'>
                                        Tổng doanh thu ({revenue?.period || 'tháng này'})
                                    </p>
                                    <p className='text-3xl sm:text-4xl font-bold text-primary tracking-tight mt-1'>
                                        {formatVND(revenue?.total ?? 0)}
                                    </p>
                                    <p className='text-xs text-base-content/50 mt-1'>
                                        Gồm đơn đã thanh toán và các phiên thu cũ đã hoàn tất
                                    </p>
                                </div>
                            </div>
                            {revenue?.changePercent != null && (
                                <div className='flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200/80 self-start'>
                                    <TrendingUp className={`w-5 h-5 ${revenue.changePercent >= 0 ? 'text-success' : 'text-error'}`} />
                                    <span className={`text-sm font-semibold ${revenue.changePercent >= 0 ? 'text-success' : 'text-error'}`}>
                                        {revenue.changePercent >= 0 ? '+' : ''}
                                        {revenue.changePercent}%
                                    </span>
                                    <span className='text-xs text-base-content/60'>so với kỳ trước</span>
                                </div>
                            )}
                        </div>

                        {hasBreakdown && (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-6'>
                                <div className='rounded-xl border border-secondary/25 bg-gradient-to-br from-secondary/5 to-base-100 p-4 flex gap-3'>
                                    <div className='p-2 rounded-lg bg-secondary/15 text-secondary shrink-0'>
                                        <FileText className='w-5 h-5' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Bán hàng</p>
                                        <p className='text-xl font-bold text-secondary mt-0.5'>
                                            {formatVND(revenue?.revenueOrders ?? 0)}
                                        </p>
                                        <p className='text-[11px] text-base-content/50 mt-1'>Đơn hàng đã thanh toán</p>
                                    </div>
                                </div>

                                <Link
                                    to='/admin/battery-trade-in'
                                    className='rounded-xl border border-accent/30 bg-gradient-to-br from-accent/8 to-base-100 p-4 flex gap-3 hover:border-accent/50 hover:shadow-md transition-all group'
                                >
                                    <div className='p-2 rounded-lg bg-accent/15 text-accent shrink-0 group-hover:scale-105 transition-transform'>
                                        <RotateCw className='w-5 h-5' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                Thu cũ đổi mới
                                            </p>
                                            <ChevronRight className='w-4 h-4 text-accent opacity-70 group-hover:translate-x-0.5 transition-transform' />
                                        </div>
                                        <p className='text-xl font-bold text-accent mt-0.5'>
                                            {formatVND(revenue?.revenueBatteryTradeIn ?? 0)}
                                        </p>
                                        <p className='text-[11px] text-base-content/50 mt-1'>Quản lý yêu cầu →</p>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {revenue?.revenueOnline != null && (
                            <div className='flex flex-wrap gap-3 mt-4 pt-4 border-t border-base-200'>
                                <div className='flex items-center gap-2 text-sm'>
                                    <Store className='w-4 h-4 text-base-content/40' />
                                    <span className='text-base-content/60'>Online:</span>
                                    <span className='font-medium'>{formatVND(revenue.revenueOnline)}</span>
                                </div>
                                <span className='text-base-content/30 hidden sm:inline'>|</span>
                                <div className='flex items-center gap-2 text-sm'>
                                    <Package className='w-4 h-4 text-base-content/40' />
                                    <span className='text-base-content/60'>Cửa hàng:</span>
                                    <span className='font-medium'>{formatVND(revenue.revenueOffline)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
                    <div className='stats shadow bg-base-100 border border-base-200 w-full'>
                        <div className='stat py-4 px-3'>
                            <div className='stat-figure text-secondary'>
                                <FileText className='w-6 h-6' />
                            </div>
                            <div className='stat-title text-xs'>Đơn đã TT</div>
                            <div className='stat-value text-secondary text-xl'>{paidOrderCount ?? 0}</div>
                            <div className='stat-desc text-[10px]'>Trong kỳ</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 border border-base-200 w-full'>
                        <div className='stat py-4 px-3'>
                            <div className='stat-figure text-warning'>
                                <AlertCircle className='w-6 h-6' />
                            </div>
                            <div className='stat-title text-xs'>Chờ xử lý</div>
                            <div className='stat-value text-warning text-xl'>{pendingCount}</div>
                            <div className='stat-desc text-[10px]'>Đơn hàng</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 border border-base-200 w-full'>
                        <div className='stat py-4 px-3'>
                            <div className='stat-figure text-info'>
                                <Users className='w-6 h-6' />
                            </div>
                            <div className='stat-title text-xs'>Khách hàng</div>
                            <div className='stat-value text-info text-xl'>{totalCustomers}</div>
                            <div className='stat-desc text-[10px]'>Tổng</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 border border-base-200 w-full'>
                        <div className='stat py-4 px-3'>
                            <div className='stat-figure text-accent'>
                                <Package className='w-6 h-6' />
                            </div>
                            <div className='stat-title text-xs'>Sản phẩm</div>
                            <div className='stat-value text-accent text-xl'>{totalProducts}</div>
                            <div className='stat-desc text-[10px]'>Catalog</div>
                        </div>
                    </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                    <Link to='/admin/orders/invoices' className='btn btn-outline btn-sm gap-2'>
                        <FileText className='w-4 h-4' />
                        Hóa đơn
                    </Link>
                    <Link to='/admin/battery-trade-in' className='btn btn-outline btn-sm gap-2 border-accent/40 text-accent hover:bg-accent/10'>
                        <RotateCw className='w-4 h-4' />
                        Thu cũ đổi mới
                    </Link>
                    <Link to='/admin/orders/report' className='btn btn-outline btn-sm gap-2'>
                        <TrendingUp className='w-4 h-4' />
                        Báo cáo đơn hàng
                    </Link>
                    <Link to='/admin/customers' className='btn btn-outline btn-sm gap-2'>
                        <Users className='w-4 h-4' />
                        Khách hàng
                    </Link>
                    <Link to='/admin/products' className='btn btn-outline btn-sm gap-2'>
                        <Package className='w-4 h-4' />
                        Sản phẩm
                    </Link>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    <div className='bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden'>
                        <div className='px-6 py-4 border-b border-base-200 flex items-center gap-2'>
                            <Users className='w-6 h-6 text-primary' />
                            <h2 className='text-lg font-bold'>Khách mua nhiều nhất ({revenue?.period})</h2>
                        </div>
                        <div className='overflow-x-auto'>
                            {topCustomers?.length === 0 ? (
                                <div className='p-8 text-center text-base-content/60'>Chưa có dữ liệu</div>
                            ) : (
                                <table className='table table-zebra'>
                                    <thead>
                                        <tr>
                                            <th className='w-12'>#</th>
                                            <th>Khách hàng</th>
                                            <th className='text-right'>Đơn hàng</th>
                                            <th className='text-right'>Tổng chi tiêu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomers?.map((c) => (
                                            <tr key={c.rank}>
                                                <td className='font-medium'>{c.rank}</td>
                                                <td>
                                                    <div className='font-medium'>{c.name}</div>
                                                    <div className='text-sm text-base-content/60'>{c.email}</div>
                                                </td>
                                                <td className='text-right'>{c.orderCount}</td>
                                                <td className='text-right font-medium'>{formatVND(c.totalSpent)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className='bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden'>
                        <div className='px-6 py-4 border-b border-base-200 flex items-center gap-2'>
                            <Package className='w-6 h-6 text-primary' />
                            <h2 className='text-lg font-bold'>Top 10 sản phẩm bán chạy ({revenue?.period})</h2>
                        </div>
                        <div className='overflow-x-auto'>
                            {topProducts?.length === 0 ? (
                                <div className='p-8 text-center text-base-content/60'>Chưa có dữ liệu</div>
                            ) : (
                                <table className='table table-zebra'>
                                    <thead>
                                        <tr>
                                            <th className='w-12'>#</th>
                                            <th>Sản phẩm</th>
                                            <th className='text-right'>Đã bán</th>
                                            <th className='text-right'>Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts?.map((p) => (
                                            <tr key={p.rank}>
                                                <td className='font-medium'>{p.rank}</td>
                                                <td>
                                                    <div className='font-medium'>{p.name}</div>
                                                    <div className='text-sm text-base-content/60'>{p.sku}</div>
                                                </td>
                                                <td className='text-right'>{p.quantitySold}</td>
                                                <td className='text-right font-medium'>{formatVND(p.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
