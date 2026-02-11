import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Package, FileBarChart } from 'lucide-react';
import {
    getReportEndOfDay,
    getReportSales,
    getReportBestSelling,
} from '@/services/managerService';
import { useBranchStore } from '@/stores/useBranchStore';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const TABS = [
    { id: 'end-of-day', label: 'Cuối ngày', icon: Calendar },
    { id: 'sales', label: 'Doanh số', icon: DollarSign },
    { id: 'best-selling', label: 'Sản phẩm bán chạy', icon: Package },
];

const ManagerReportsPage = () => {
    const { currentLocationId } = useBranchStore();
    const [activeTab, setActiveTab] = useState('end-of-day');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                if (activeTab === 'end-of-day') {
                    const res = await getReportEndOfDay(currentLocationId, date);
                    setData(res);
                } else if (activeTab === 'sales') {
                    const res = await getReportSales(currentLocationId, from, to);
                    setData(res);
                } else {
                    const res = await getReportBestSelling(currentLocationId, from, to);
                    setData(res);
                }
            } catch (err) {
                console.error('Report fetch error:', err);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [activeTab, currentLocationId, date, from, to]);

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-2">
                    <FileBarChart className="size-8 text-primary" />
                    <h1 className="text-2xl font-bold text-base-content">Báo cáo</h1>
                </div>

                {/* Tabs */}
                <div className="tabs tabs-boxed bg-base-100 p-1 rounded-lg">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon className="size-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                    {activeTab === 'end-of-day' && (
                        <label className="form-control w-full max-w-xs">
                            <span className="label">Ngày</span>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input input-bordered"
                            />
                        </label>
                    )}
                    {(activeTab === 'sales' || activeTab === 'best-selling') && (
                        <>
                            <label className="form-control w-full max-w-xs">
                                <span className="label">Từ ngày</span>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="input input-bordered"
                                />
                            </label>
                            <label className="form-control w-full max-w-xs">
                                <span className="label">Đến ngày</span>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="input input-bordered"
                                />
                            </label>
                        </>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : (
                    <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
                        {activeTab === 'end-of-day' && data?.summary && (
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold">Tổng kết ngày {data.date}</h2>
                                <div className="stats stats-vertical lg:stats-horizontal shadow">
                                    <div className="stat">
                                        <div className="stat-title">Tổng đơn</div>
                                        <div className="stat-value">{data.summary.totalOrders || 0}</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-title">Doanh thu</div>
                                        <div className="stat-value text-primary">{formatVND(data.summary.totalRevenue)}</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-title">Số lượng bán</div>
                                        <div className="stat-value">{data.summary.totalItemsSold || 0}</div>
                                    </div>
                                </div>
                                <p className="text-base-content/60 text-sm">Chưa có Order model → dữ liệu mẫu</p>
                            </div>
                        )}

                        {activeTab === 'sales' && data?.summary && (
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold">Báo cáo doanh số ({data.from} - {data.to})</h2>
                                <div className="stats stats-vertical lg:stats-horizontal shadow">
                                    <div className="stat">
                                        <div className="stat-title">Doanh thu</div>
                                        <div className="stat-value text-primary">{formatVND(data.summary.totalRevenue)}</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-title">Tổng đơn</div>
                                        <div className="stat-value">{data.summary.totalOrders || 0}</div>
                                    </div>
                                    <div className="stat">
                                        <div className="stat-title">So với kỳ trước</div>
                                        <div className="stat-value">{data.summary.changePercent ?? 0}%</div>
                                    </div>
                                </div>
                                <p className="text-base-content/60 text-sm">Chưa có Order model → dữ liệu mẫu</p>
                            </div>
                        )}

                        {activeTab === 'best-selling' && data?.items && (
                            <div className="overflow-x-auto">
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
                                        {data.items.map((p) => (
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
                                {data.items.length === 0 && (
                                    <div className="p-8 text-center text-base-content/60">Chưa có dữ liệu</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerReportsPage;
