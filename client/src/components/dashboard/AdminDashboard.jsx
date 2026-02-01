import React, { useEffect, useState } from 'react';
import { DollarSign, Users, Package, TrendingUp } from 'lucide-react';
import { getDashboardStats } from '@/services/dashboardService';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: { total: 0, period: '', changePercent: 0 },
        topCustomers: [],
        topProducts: [],
    });

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const data = await getDashboardStats();
            setStats(data);
            setLoading(false);
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    const { revenue, topCustomers, topProducts } = stats;

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-base-content">Tổng quan</h1>

                {/* Doanh thu */}
                <div className="stats shadow w-full bg-base-100">
                    <div className="stat">
                        <div className="stat-figure text-primary">
                            <DollarSign className="w-10 h-10" />
                        </div>
                        <div className="stat-title">Doanh thu ({revenue.period})</div>
                        <div className="stat-value text-primary">{formatVND(revenue.total)}</div>
                        {revenue.changePercent != null && (
                            <div className="stat-desc flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-success" />
                                <span className={revenue.changePercent >= 0 ? 'text-success' : 'text-error'}>
                                    {revenue.changePercent >= 0 ? '+' : ''}{revenue.changePercent}% so với kỳ trước
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Khách mua nhiều nhất */}
                    <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-base-200 flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            <h2 className="text-lg font-bold">Khách mua nhiều nhất</h2>
                        </div>
                        <div className="overflow-x-auto">
                            {topCustomers.length === 0 ? (
                                <div className="p-8 text-center text-base-content/60">Chưa có dữ liệu</div>
                            ) : (
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th className="w-12">#</th>
                                            <th>Khách hàng</th>
                                            <th className="text-right">Đơn hàng</th>
                                            <th className="text-right">Tổng chi tiêu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomers.map((c) => (
                                            <tr key={c.rank}>
                                                <td className="font-medium">{c.rank}</td>
                                                <td>
                                                    <div className="font-medium">{c.name}</div>
                                                    <div className="text-sm text-base-content/60">{c.email}</div>
                                                </td>
                                                <td className="text-right">{c.orderCount}</td>
                                                <td className="text-right font-medium">{formatVND(c.totalSpent)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Top 10 sản phẩm bán chạy */}
                    <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-base-200 flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary" />
                            <h2 className="text-lg font-bold">Top 10 sản phẩm bán chạy</h2>
                        </div>
                        <div className="overflow-x-auto">
                            {topProducts.length === 0 ? (
                                <div className="p-8 text-center text-base-content/60">Chưa có dữ liệu</div>
                            ) : (
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th className="w-12">#</th>
                                            <th>Sản phẩm</th>
                                            <th className="text-right">Đã bán</th>
                                            <th className="text-right">Doanh thu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((p) => (
                                            <tr key={p.rank}>
                                                <td className="font-medium">{p.rank}</td>
                                                <td>
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-sm text-base-content/60">{p.sku}</div>
                                                </td>
                                                <td className="text-right">{p.quantitySold}</td>
                                                <td className="text-right font-medium">{formatVND(p.revenue)}</td>
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
