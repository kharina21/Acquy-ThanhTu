import api from '@/lib/axios';

/**
 * Lấy mã kiểm kho tiếp theo (tự động: KK-YYYYMMDD-XXX).
 */
export const getNextStockCheckCode = async () => {
    try {
        const { data } = await api.get('/stock-checks/next-code');
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
 * Payload: { code, note?, items: [{ productId, quantityCounted }] }
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
