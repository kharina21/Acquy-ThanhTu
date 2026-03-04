import api from '@/lib/axios';

export const createOrder = async (data) => {
    const res = await api.post('/orders', data);
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
