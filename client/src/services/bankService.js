import api from '@/lib/axios';

/** Danh sách ngân hàng (VietQR, qua backend). */
export const getVietQrBanks = async () => {
    const res = await api.get('/vietqr-banks');
    return res.data;
};
