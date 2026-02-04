import api from '@/lib/axios';

export const getShifts = async (params = {}) => {
    const res = await api.get('/shifts', { params });
    return res.data;
};

export const getShiftById = async (id) => {
    const res = await api.get(`/shifts/${id}`);
    return res.data;
};

export const createShift = async (payload) => {
    const res = await api.post('/shifts', payload);
    return res.data;
};

export const updateShift = async (id, payload) => {
    const res = await api.put(`/shifts/${id}`, payload);
    return res.data;
};

export const deleteShift = async (id) => {
    const res = await api.delete(`/shifts/${id}`);
    return res.data;
};
