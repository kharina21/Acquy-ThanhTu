import api from '@/lib/axios';

/**
 * Lấy mã kiểm kho tiếp theo (tự động: KK-YYYYMMDD-XXX).
 */
export const getNextStockCheckCode = async (documentDateYmd) => {
    try {
        const params = {};
        if (documentDateYmd) params.date = documentDateYmd;
        const { data } = await api.get('/stock-checks/next-code', { params });
        return data?.success ? data.data.code : null;
    } catch (error) {
        console.error('getNextStockCheckCode error:', error?.response?.data || error);
        return null;
    }
};

/**
 * Danh sách phiếu kiểm kho (phân trang).
 * Params: page, limit, locationId, fromDate, toDate, brand, category
 */
export const getStockChecks = async (params = {}) => {
    try {
        const { page = 1, limit = 10, locationId, fromDate, toDate, brand, category } = params;
        const requestParams = { page, limit };
        if (locationId) requestParams.locationId = locationId;
        if (fromDate) requestParams.fromDate = fromDate;
        if (toDate) requestParams.toDate = toDate;
        if (brand) requestParams.brand = brand;
        if (category) requestParams.category = category;
        const { data } = await api.get('/stock-checks', { params: requestParams });
        return data?.success ? data : { success: false, data: { stockChecks: [], pagination: {} } };
    } catch (error) {
        console.error('getStockChecks error:', error?.response?.data || error);
        return {
            success: false,
            data: { stockChecks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
        };
    }
};

/**
 * Chi tiết phiếu kiểm kho.
 */
export const getStockCheckById = async (id) => {
    try {
        const { data } = await api.get(`/stock-checks/${id}`);
        return data?.success ? data : { success: false, data: { stockCheck: null } };
    } catch (error) {
        console.error('getStockCheckById error:', error?.response?.data || error);
        return { success: false, data: { stockCheck: null } };
    }
};

/**
 * Tạo phiếu kiểm kho.
 * Payload: { code, note?, documentDate? (YYYY-MM-DD), items: [{ productId, quantityCounted }] }
 */
export const createStockCheck = async (payload) => {
    try {
        const { data } = await api.post('/stock-checks', payload);
        return data;
    } catch (error) {
        console.error('createStockCheck error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Cập nhật phiếu nháp: số đếm thực tế + ghi chú.
 * Payload: { note?, items: [{ productId, quantityCounted }] }
 */
export const updateStockCheck = async (id, payload) => {
    try {
        const { data } = await api.put(`/stock-checks/${id}`, payload);
        return data;
    } catch (error) {
        console.error('updateStockCheck error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Xác nhận phiếu kiểm kho (cập nhật tồn kho theo số đếm thực tế).
 */
export const confirmStockCheck = async (id) => {
    try {
        const { data } = await api.put(`/stock-checks/${id}/confirm`);
        return data;
    } catch (error) {
        console.error('confirmStockCheck error:', error?.response?.data || error);
        throw error;
    }
};

/** Hủy xác nhận: khôi phục tồn theo số sổ trước kiểm, phiếu về nháp. */
export const reopenStockCheck = async (id) => {
    try {
        const { data } = await api.put(`/stock-checks/${id}/reopen`);
        return data;
    } catch (error) {
        console.error('reopenStockCheck error:', error?.response?.data || error);
        throw error;
    }
};

/** Xóa phiếu (nháp hoặc đã xác nhận — đã xác nhận thì backend hoàn tác tồn trước). */
export const deleteStockCheck = async (id) => {
    try {
        const { data } = await api.delete(`/stock-checks/${id}`);
        return data;
    } catch (error) {
        console.error('deleteStockCheck error:', error?.response?.data || error);
        throw error;
    }
};
