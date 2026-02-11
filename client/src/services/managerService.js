import api from '@/lib/axios';

/**
 * Dashboard - thống kê tổng quan
 */
export const getManagerDashboard = async (locationId = null) => {
    const params = locationId ? { locationId } : {};
    const res = await api.get('/manager/dashboard', { params });
    return res.data;
};

/**
 * Báo cáo cuối ngày
 */
export const getReportEndOfDay = async (locationId = null, date = null) => {
    const params = {};
    if (locationId) params.locationId = locationId;
    if (date) params.date = date;
    const res = await api.get('/manager/reports/end-of-day', { params });
    return res.data;
};

/**
 * Báo cáo doanh số
 */
export const getReportSales = async (locationId = null, from = null, to = null) => {
    const params = {};
    if (locationId) params.locationId = locationId;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/manager/reports/sales', { params });
    return res.data;
};

/**
 * Báo cáo sản phẩm bán chạy
 */
export const getReportBestSelling = async (locationId = null, from = null, to = null) => {
    const params = {};
    if (locationId) params.locationId = locationId;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get('/manager/reports/best-selling', { params });
    return res.data;
};
