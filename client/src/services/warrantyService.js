import api from '@/lib/axios';

/**
 * Tra cứu bảo hành bằng mã hóa đơn (Public)
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
 * Danh sách TẤT CẢ yêu cầu bảo hành (Admin)
 * GET /api/warranties/claims
 * Query params: page, limit, claimStatus, reason, orderCode, dateFrom, dateTo, search
 */
export const getAllClaims = async (params = {}) => {
    const res = await api.get('/warranties/claims', { params });
    return res.data;
};

/**
 * Cập nhật yêu cầu bảo hành (Admin)
 * PUT /api/warranties/:id/claims/:claimCode
 * Body: { status, resolutionNotes }
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

/**
 * Tạo phiếu bảo hành (Admin)
 * POST /api/warranties/create-claim
 * Body: { orderCode, productId, reason, description, customerName, customerPhone, customerAddress, notes }
 */
export const createWarrantyClaim = async (data) => {
    const res = await api.post('/warranties/create-claim', data);
    return res.data;
};

/**
 * Tìm kiếm đơn hàng (Admin - để tạo phiếu BH)
 * GET /api/orders/search?code=xxx
 */
export const searchOrders = async (params) => {
    const res = await api.get('/orders/search', { params });
    return res.data;
};
