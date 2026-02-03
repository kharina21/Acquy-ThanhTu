import api from '@/lib/axios';

export const getLocations = async (params = {}) => {
    const res = await api.get('/locations', { params });
    return res.data;
};

export const getLocationById = async (id) => {
    const res = await api.get(`/locations/${id}`);
    return res.data;
};

export const createLocation = async (data) => {
    const res = await api.post('/locations', data);
    return res.data;
};

export const updateLocation = async (id, data) => {
    const res = await api.put(`/locations/${id}`, data);
    return res.data;
};

export const deleteLocation = async (id) => {
    const res = await api.delete(`/locations/${id}`);
    return res.data;
};
