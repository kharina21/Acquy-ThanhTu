import api from '@/lib/axios';

/** GET ?locationId=xxx hoặc ?productId=xxx */
export const getProductStocks = async (params = {}) => {
    const res = await api.get('/product-stocks', { params });
    return res.data;
};

/** PUT body: { productId, locationId, quantity } */
export const setProductStock = async (payload) => {
    const res = await api.put('/product-stocks', payload);
    return res.data;
};

/** PUT /bulk body: { locationId, items: [{ productId, quantity }] } */
export const bulkSetProductStock = async (payload) => {
    const res = await api.put('/product-stocks/bulk', payload);
    return res.data;
};
