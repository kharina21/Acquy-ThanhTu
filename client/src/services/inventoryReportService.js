import api from '@/lib/axios';

export const getNxtReport = async (params = {}) => {
    const res = await api.get('/inventory-reports/nxt', { params });
    return res.data;
};

export const getStockInLinesReport = async (params = {}) => {
    const res = await api.get('/inventory-reports/stock-in-lines', { params });
    return res.data;
};

export const getStockOutLinesReport = async (params = {}) => {
    const res = await api.get('/inventory-reports/stock-out-lines', { params });
    return res.data;
};
