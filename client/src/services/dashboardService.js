import api from '@/lib/axios';

/**
 * Lấy thống kê tổng quan dashboard (doanh thu, top khách hàng, top sản phẩm)
 */
export const getDashboardStats = async () => {
    try {
        const res = await api.get('/dashboard/stats');
        const data = res.data?.data;
        if (!data) {
            return {
                revenue: { total: 0, period: 'tháng này', changePercent: 0 },
                topCustomers: [],
                topProducts: [],
            };
        }
        return {
            revenue: data.revenue || { total: 0, period: 'tháng này', changePercent: 0 },
            topCustomers: data.topCustomers || [],
            topProducts: data.topProducts || [],
        };
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return {
            revenue: { total: 0, period: 'tháng này', changePercent: 0 },
            topCustomers: [],
            topProducts: [],
        };
    }
};
