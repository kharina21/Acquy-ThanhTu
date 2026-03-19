import api from '@/lib/axios';

export const getNextSupplierCode = async () => {
    try {
        const { data } = await api.get('/suppliers/next-code');
        return data?.success ? data.data?.code : null;
    } catch (error) {
        console.error('getNextSupplierCode error:', error?.response?.data || error);
        return null;
    }
};

export const getSuppliers = async (params = {}) => {
    const res = await api.get('/suppliers', { params });
    return res.data;
};

export const getSupplierById = async (id) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
};

export const createSupplier = async (data) => {
    const res = await api.post('/suppliers', data);
    return res.data;
};

export const updateSupplier = async (id, data) => {
    const res = await api.put(`/suppliers/${id}`, data);
    return res.data;
};

export const deleteSupplier = async (id) => {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
};
