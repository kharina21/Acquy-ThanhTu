import api from '@/lib/axios';

export const getBrands = async (params = {}) => {
    const res = await api.get('/brands', { params });
    return res.data;
};

export const getBrandById = async (id) => {
    const res = await api.get(`/brands/${id}`);
    return res.data;
};

export const createBrand = async (data) => {
    const res = await api.post('/brands', data);
    return res.data;
};

export const updateBrand = async (id, data) => {
    const res = await api.put(`/brands/${id}`, data);
    return res.data;
};

export const deleteBrand = async (id) => {
    const res = await api.delete(`/brands/${id}`);
    return res.data;
};

