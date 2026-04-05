import api from '@/lib/axios';

export const getNextStockOutCode = async () => {
    try {
        const { data } = await api.get('/stock-outs/next-code');
        return data?.success ? data.data?.code : null;
    } catch (error) {
        console.error('getNextStockOutCode error:', error?.response?.data || error);
        return null;
    }
};

export const getStockOuts = async (params = {}) => {
    const res = await api.get('/stock-outs', { params });
    return res.data;
};

export const getStockOutById = async (id) => {
    const res = await api.get(`/stock-outs/${id}`);
    return res.data;
};

export const createStockOut = async (data) => {
    const res = await api.post('/stock-outs', data);
    return res.data;
};

export const updateStockOut = async (id, data) => {
    const res = await api.put(`/stock-outs/${id}`, data);
    return res.data;
};

export const confirmStockOut = async (id) => {
    const res = await api.put(`/stock-outs/${id}/confirm`);
    return res.data;
};

export const deleteStockOut = async (id) => {
    const res = await api.delete(`/stock-outs/${id}`);
    return res.data;
};
