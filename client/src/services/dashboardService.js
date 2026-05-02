import api from '@/lib/axios';

/**
 * Lấy thống kê tổng quan dashboard
 * @param {{ period?: 'week'|'month', dateFrom?: string, dateTo?: string, locationId?: string }} params
 */
export const getDashboardStats = async (params = {}) => {
    try {
        const res = await api.get('/dashboard/stats', { params });
        const data = res.data?.data;
        if (!data) {
            return {
                revenue: { total: 0, period: 'tháng này', changePercent: 0 },
                ordersByStatus: { pending: 0, confirmed: 0, paid: 0, cancelled: 0 },
                paidOrderCount: 0,
                pendingCount: 0,
                totalCustomers: 0,
                totalProducts: 0,
                topCustomers: [],
                topProducts: [],
            };
        }
        return {
            revenue: {
                total: data.revenue?.total ?? 0,
                period: data.revenue?.period ?? 'tháng này',
                changePercent: data.revenue?.changePercent ?? 0,
                ...(data.revenue?.grossSales != null && { grossSales: data.revenue.grossSales }),
                ...(data.revenue?.tradeInExpense != null && { tradeInExpense: data.revenue.tradeInExpense }),
                ...(data.revenue?.netSales != null && { netSales: data.revenue.netSales }),
                ...(data.revenue?.revenueOrders != null && { revenueOrders: data.revenue.revenueOrders }),
                ...(data.revenue?.revenueBatteryTradeIn != null && { revenueBatteryTradeIn: data.revenue.revenueBatteryTradeIn }),
                ...(data.revenue?.revenueOnline != null && { revenueOnline: data.revenue.revenueOnline }),
                ...(data.revenue?.revenueOffline != null && { revenueOffline: data.revenue.revenueOffline }),
            },
            ordersByStatus: data.ordersByStatus || { pending: 0, confirmed: 0, paid: 0, cancelled: 0 },
            paidOrderCount: data.paidOrderCount ?? 0,
            pendingCount: data.pendingCount ?? 0,
            totalCustomers: data.totalCustomers ?? 0,
            totalProducts: data.totalProducts ?? 0,
            topCustomers: data.topCustomers || [],
            topProducts: data.topProducts || [],
        };
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return {
            revenue: { total: 0, period: 'tháng này', changePercent: 0 },
            ordersByStatus: { pending: 0, confirmed: 0, paid: 0, cancelled: 0 },
            paidOrderCount: 0,
            pendingCount: 0,
            totalCustomers: 0,
            totalProducts: 0,
            topCustomers: [],
            topProducts: [],
        };
    }
};

/**
 * Lấy dữ liệu biểu đồ dashboard
 * @param {{ period?: 'week'|'month', locationId?: string }} params
 */
export const getDashboardChartData = async (params = {}) => {
    try {
        const res = await api.get('/dashboard/chart-data', { params });
        return res.data?.data || { dailyRevenue: [], invoiceDistribution: [] };
    } catch (error) {
        console.error('getDashboardChartData error:', error);
        return { dailyRevenue: [], invoiceDistribution: [] };
    }
};
