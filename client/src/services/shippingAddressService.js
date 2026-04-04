import api from '@/lib/axios';

export const getShippingAddresses = async () => {
  const res = await api.get('/shipping-addresses');
  return res.data;
};

export const createShippingAddress = async (data) => {
  const res = await api.post('/shipping-addresses', data);
  return res.data;
};

export const updateShippingAddress = async (id, data) => {
  const res = await api.put(`/shipping-addresses/${id}`, data);
  return res.data;
};

export const deleteShippingAddress = async (id) => {
  const res = await api.delete(`/shipping-addresses/${id}`);
  return res.data;
};

export const setDefaultShippingAddress = async (id) => {
  const res = await api.patch(`/shipping-addresses/${id}/default`);
  return res.data;
};
