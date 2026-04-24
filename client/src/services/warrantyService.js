import api from '@/lib/axios';

/**
 * Tra cứu bảo hành bằng mã hóa đơn (Public – không cần đăng nhập)
 * GET /api/warranties/lookup/:orderCode
 */
export const lookupWarrantyByOrderCode = async (orderCode) => {
    const res = await api.get(`/warranties/lookup/${encodeURIComponent(orderCode)}`);
    return res.data;
};

/**
 * Lấy chi tiết một bảo hành
 * GET /api/warranties/:id
 */
export const getWarrantyById = async (id) => {
    const res = await api.get(`/warranties/${id}`);
    return res.data;
};

/**
 * Danh sách bảo hành (Admin)
 * GET /api/warranties
 * Query params: page, limit, status, orderCode, productId, customerId, dateFrom, dateTo
 */
export const getWarranties = async (params = {}) => {
    const res = await api.get('/warranties', { params });
    return res.data;
};

/**
 * Tạo yêu cầu bảo hành
 * POST /api/warranties/:id/claim
 * Body: { reason, description }
 */
export const createWarrantyClaim = async (warrantyId, data) => {
    const res = await api.post(`/warranties/${warrantyId}/claim`, data);
    return res.data;
};

/**
 * Cập nhật yêu cầu bảo hành (Admin)
 * PUT /api/warranties/:id/claims/:claimCode
 * Body: { status, notes }
 */
export const updateWarrantyClaim = async (warrantyId, claimCode, data) => {
    const res = await api.put(`/warranties/${warrantyId}/claims/${claimCode}`, data);
    return res.data;
};

/**
 * Lấy tất cả bảo hành của một Order (Admin)
 * GET /api/warranties/order/:orderCode
 */
export const getWarrantiesByOrderCode = async (orderCode) => {
    const res = await api.get(`/warranties/order/${encodeURIComponent(orderCode)}`);
    return res.data;
};

/**
 * Thống kê bảo hành (Dashboard Admin)
 * GET /api/warranties/stats
 */
export const getWarrantyStats = async () => {
    const res = await api.get('/warranties/stats');
    return res.data;
};
