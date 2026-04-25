import api from '@/lib/axios';

export const getStoreSettings = async () => {
    const { data } = await api.get('/store-settings');
    return data;
};

/**
 * Cập nhật cài đặt: { defaultVatPercent, taxCode? } — hoặc gọi với một số (chỉ % VAT) như trước
 */
export const updateStoreSettings = async (payload) => {
    const body = typeof payload === 'number' ? { defaultVatPercent: payload } : payload;
    const { data } = await api.put('/store-settings', body);
    return data;
};
