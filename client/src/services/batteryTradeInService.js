import api from '@/lib/axios';

export const uploadBatteryImage = async (files) => {
    const list = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    list.forEach((file) => formData.append('image', file));
    const { data } = await api.post('/battery-trade-in/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

export const submitBatteryTradeIn = async (payload) => {
    const { data } = await api.post('/battery-trade-in', payload);
    return data;
};

/** Tra cứu yêu cầu thu cũ (public, không cần đăng nhập) */
export const lookupBatteryTradeIn = async ({ code, email }) => {
    const { data } = await api.post('/battery-trade-in/lookup', { code, email });
    return data;
};

/** Prefill form sửa (chỉ khi đơn đang xử lý) */
export const getBatteryTradeInPrefill = async ({ code, email }) => {
    const { data } = await api.get('/battery-trade-in/lookup/prefill', {
        params: { code, email },
    });
    return data;
};

/** Khách cập nhật đơn (mã + Gmail, chỉ pending) */
export const updateBatteryTradeInByLookup = async (payload) => {
    const { data } = await api.patch('/battery-trade-in/lookup', payload);
    return data;
};

/** Khách xóa đơn (mã + Gmail, chỉ pending) */
export const deleteBatteryTradeInByLookup = async ({ code, email }) => {
    const { data } = await api.post('/battery-trade-in/lookup/delete', { code, email });
    return data;
};

/** Admin sửa chi tiết đơn */
export const updateBatteryTradeInDetails = async (id, payload) => {
    const { data } = await api.patch(`/battery-trade-in/${id}/details`, payload);
    return data;
};

export const getBatteryTradeInList = async (params = {}) => {
    const { data } = await api.get('/battery-trade-in', { params });
    return data;
};

/** Chi tiết một đơn (admin/manager) — dùng cho deep link từ báo cáo */
export const getBatteryTradeInById = async (id) => {
    const { data } = await api.get(`/battery-trade-in/${id}`);
    return data;
};

/** Đơn thu cũ của tài khoản đang đăng nhập (cần Bearer token) */
export const getMyBatteryTradeIns = async (params = {}) => {
    const { data } = await api.get('/battery-trade-in/mine', { params });
    return data;
};

/**
 * @param {string} id
 * @param {Record<string, unknown>} payload - { status } hoặc thêm cancelledReason / completedProductName, completedAmount, completedNote, locationId, appointmentAt...
 */
export const updateBatteryTradeInStatus = async (id, payload) => {
    const { data } = await api.patch(`/battery-trade-in/${id}`, payload);
    return data;
};
