import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { DollarSign, Users, Package, TrendingUp, FileText, AlertCircle, ChevronRight } from 'lucide-react';
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

    const { revenue, ordersByStatus, paidOrderCount, pendingCount, totalCustomers, totalProducts, topCustomers, topProducts } = stats;

    return (
        <div className='flex-1 p-6 bg-base-200 overflow-y-auto'>
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
                    <div className='flex gap-2'>
                        <button
                            type='button'
                            className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPeriod('week')}
                        >
                            Tuần này
                        </button>
                        <button
                            type='button'
                            className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPeriod('month')}
                        >
                            Tháng này
                        </button>
                    </div>
                </div>

                {/* Đơn chờ xử lý - nổi bật nếu có */}
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

                {/* Thẻ thống kê */}
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
                    <div className='stats shadow bg-base-100 w-full'>
                        <div className='stat'>
                            <div className='stat-figure text-primary'>
                                <DollarSign className='w-8 h-8' />
                            </div>
                            <div className='stat-title'>Doanh thu ({revenue?.period || 'tháng này'})</div>
                            <div className='stat-value text-primary text-2xl'>
                                {formatVND(revenue?.total ?? 0)}
                            </div>
                            <div className='stat-desc text-xs text-base-content/60'>Từ đơn đã thanh toán</div>
                            {revenue?.revenueOnline != null && (
                                <div className='stat-desc flex flex-col gap-0.5 text-xs'>
                                    <span>Online: {formatVND(revenue.revenueOnline)}</span>
                                    <span>Offline: {formatVND(revenue.revenueOffline)}</span>
                                </div>
                            )}
                            {revenue?.changePercent != null && (
                                <div className='stat-desc flex items-center gap-1'>
                                    <TrendingUp className='w-4 h-4 text-success' />
                                    <span className={revenue.changePercent >= 0 ? 'text-success' : 'text-error'}>
                                        {revenue.changePercent >= 0 ? '+' : ''}
                                        {revenue.changePercent}% so với kỳ trước
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 w-full'>
                        <div className='stat'>
                            <div className='stat-figure text-secondary'>
                                <FileText className='w-8 h-8' />
                            </div>
                            <div className='stat-title'>Đơn đã thanh toán</div>
                            <div className='stat-value text-secondary text-2xl'>{paidOrderCount ?? 0}</div>
                            <div className='stat-desc'>Đơn hoàn thành trong kỳ</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 w-full'>
                        <div className='stat'>
                            <div className='stat-figure text-warning'>
                                <AlertCircle className='w-8 h-8' />
                            </div>
                            <div className='stat-title'>Đơn chờ xử lý</div>
                            <div className='stat-value text-warning text-2xl'>{pendingCount}</div>
                            <div className='stat-desc'>Cần xử lý</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 w-full'>
                        <div className='stat'>
                            <div className='stat-figure text-info'>
                                <Users className='w-8 h-8' />
                            </div>
                            <div className='stat-title'>Khách hàng</div>
                            <div className='stat-value text-info text-2xl'>{totalCustomers}</div>
                            <div className='stat-desc'>Tổng số khách</div>
                        </div>
                    </div>
                    <div className='stats shadow bg-base-100 w-full'>
                        <div className='stat'>
                            <div className='stat-figure text-accent'>
                                <Package className='w-8 h-8' />
                            </div>
                            <div className='stat-title'>Sản phẩm</div>
                            <div className='stat-value text-accent text-2xl'>{totalProducts}</div>
                            <div className='stat-desc'>Trong catalog</div>
                        </div>
                    </div>
                </div>

                {/* Quick links */}
                <div className='flex flex-wrap gap-3'>
                    <Link
                        to='/admin/orders/invoices'
                        className='btn btn-outline btn-sm gap-2'
                    >
                        <FileText className='w-4 h-4' />
                        Hóa đơn
                    </Link>
                    <Link
                        to='/admin/orders/report'
                        className='btn btn-outline btn-sm gap-2'
                    >
                        <TrendingUp className='w-4 h-4' />
                        Báo cáo đơn hàng
                    </Link>
                    <Link
                        to='/admin/customers'
                        className='btn btn-outline btn-sm gap-2'
                    >
                        <Users className='w-4 h-4' />
                        Khách hàng
                    </Link>
                    <Link
                        to='/admin/products'
                        className='btn btn-outline btn-sm gap-2'
                    >
                        <Package className='w-4 h-4' />
                        Sản phẩm
                    </Link>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {/* Khách mua nhiều nhất */}
                    <div className='bg-base-100 rounded-xl shadow-lg overflow-hidden'>
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

                    {/* Top 10 sản phẩm bán chạy */}
                    <div className='bg-base-100 rounded-xl shadow-lg overflow-hidden'>
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
