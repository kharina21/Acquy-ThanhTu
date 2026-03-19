import api from '@/lib/axios';

export const createOrder = async (data) => {
    const res = await api.post('/orders', data);
    return res.data;
};

export const createOrderFromItems = async (data) => {
    const res = await api.post('/orders/from-items', data);
    return res.data;
};

export const getMyOrders = async (params = {}) => {
    const res = await api.get('/orders', { params });
    return res.data;
};

export const getOrderById = async (id) => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
};

/**
 * Cập nhật đơn hàng (xác nhận đơn, xác nhận thanh toán) - Admin/Manager
 */
export const updateOrder = async (id, data) => {
    const res = await api.put(`/orders/${id}`, data);
    return res.data;
};

/**
 * Báo cáo đơn hàng đã xác nhận và thanh toán - Admin/Manager
 */
export const getOrderReport = async (params = {}) => {
    const res = await api.get('/orders/report', { params });
    return res.data;
};
