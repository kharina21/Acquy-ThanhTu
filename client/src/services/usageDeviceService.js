import api from '@/lib/axios';

export const getUsageDevices = async (params = {}) => {
    const res = await api.get('/usage-devices', { params });
    return res.data;
};

export const getUsageDeviceById = async (id) => {
    const res = await api.get(`/usage-devices/${id}`);
    return res.data;
};

export const createUsageDevice = async (data) => {
    const res = await api.post('/usage-devices', data);
    return res.data;
};

export const updateUsageDevice = async (id, data) => {
    const res = await api.put(`/usage-devices/${id}`, data);
    return res.data;
};

export const deleteUsageDevice = async (id) => {
    const res = await api.delete(`/usage-devices/${id}`);
    return res.data;
};

