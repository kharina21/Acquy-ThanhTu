import api from '@/lib/axios';

export const getStockReturns = async (params = {}) => {
    const res = await api.get('/stock-returns', { params });
    return res.data;
};

export const getStockReturnById = async (id) => {
    const res = await api.get(`/stock-returns/${id}`);
    return res.data;
};

export const getNextStockReturnCode = async () => {
    try {
        const { data } = await api.get('/stock-returns/next-code');
        return data?.success ? data.data?.code : null;
    } catch (error) {
        console.error('getNextStockReturnCode error:', error?.response?.data || error);
        return null;
    }
};

export const createStockReturn = async (data) => {
    const res = await api.post('/stock-returns', data);
    return res.data;
};

export const deleteStockReturn = async (id) => {
    const res = await api.delete(`/stock-returns/${id}`);
    return res.data;
};
