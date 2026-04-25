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
 * Upload ảnh bảo hành lên Cloudinary
 * POST /api/warranties/upload-images
 * Body: FormData, field: images[] (multipart)
 */
export const uploadWarrantyImages = async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await api.post('/warranties/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
    });
    return res.data;
};

/**
 * Gửi yêu cầu bảo hành từ mã hóa đơn (Public)
 * POST /api/warranties/claim-from-order
 * Body: { orderCode, productId, reason, description, images[], customerName, customerPhone, customerAddress, notes }
 */
export const submitClaimFromOrder = async (data) => {
    const res = await api.post('/warranties/claim-from-order', data);
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
