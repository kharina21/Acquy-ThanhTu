import api from '@/lib/axios';

export const getNextStockInCode = async () => {
    try {
        const { data } = await api.get('/stock-ins/next-code');
        return data?.success ? data.data?.code : null;
    } catch (error) {
        console.error('getNextStockInCode error:', error?.response?.data || error);
        return null;
    }
};

export const getStockIns = async (params = {}) => {
    const res = await api.get('/stock-ins', { params });
    return res.data;
};

export const getStockInById = async (id) => {
    const res = await api.get(`/stock-ins/${id}`);
    return res.data;
};

/** Sinh danh sách seri số không trùng (server kiểm tra DB). Body: { quantity, excludeSerials? } */
export const generateStockInSerials = async (payload) => {
    const res = await api.post('/stock-ins/generate-serials', payload);
    return res.data;
};

export const createStockIn = async (data) => {
    const res = await api.post('/stock-ins', data);
    return res.data;
};

export const updateStockIn = async (id, data) => {
    const res = await api.put(`/stock-ins/${id}`, data);
    return res.data;
};

export const confirmStockIn = async (id) => {
    const res = await api.put(`/stock-ins/${id}/confirm`);
    return res.data;
};

export const deleteStockIn = async (id) => {
    const res = await api.delete(`/stock-ins/${id}`);
    return res.data;
};
