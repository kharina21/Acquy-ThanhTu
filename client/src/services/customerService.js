import api from '@/lib/axios';

export const getCustomers = async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
};

export const getCustomerById = async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
};

export const searchCustomersByPhone = async (term) => {
    const res = await api.get('/customers/search', { params: { q: term } });
    return res.data;
};

export const createCustomer = async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
};

export const updateCustomer = async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
};

export const deleteCustomer = async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
};

export const restoreCustomer = async (id) => {
    const res = await api.post(`/customers/${id}/restore`);
    return res.data;
};
