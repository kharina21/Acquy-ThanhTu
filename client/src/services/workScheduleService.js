import api from '@/lib/axios';

export const getWorkSchedules = async (params = {}) => {
    const res = await api.get('/work-schedules', { params });
    return res.data;
};

export const createWorkSchedule = async (payload) => {
    const res = await api.post('/work-schedules', payload);
    return res.data;
};

export const updateWorkSchedule = async (id, payload) => {
    const res = await api.put(`/work-schedules/${id}`, payload);
    return res.data;
};

export const deleteWorkSchedule = async (id) => {
    const res = await api.delete(`/work-schedules/${id}`);
    return res.data;
};

