import * as XLSX from 'xlsx';
import api from '@/lib/axios';

/**
 * Service quản lý sản phẩm.
 * Format Excel: 13 cột - Loại hàng, Thương hiệu, Mã hàng, Mã vạch, Tên hàng, Dung lượng (Ah),
 * Đơn giá nhập (VNĐ), Đơn giá bán (VNĐ), Tồn kho, Hình ảnh, Đang kinh doanh, Bảo hành, Ghi chú.
 */

const HEADERS = [
    'Loại hàng',
    'Thương hiệu',
    'Mã hàng',
    'Mã vạch',
    'Tên hàng',
    'Dung lượng (Ah)',
    'Đơn giá nhập (VNĐ)',
    'Đơn giá bán (VNĐ)',
    'Tồn kho',
    'Hình ảnh',
    'Đang kinh doanh',
    'Bảo hành',
    'Ghi chú',
];

/**
 * Tạo file Excel mẫu (blob) đúng format 13 cột.
 */
export const generateSampleExcelBlob = () => {
    const sampleData = [
        HEADERS,
        ['Ắc quy', 'ATLASBX', 'Xpro 90', '', 'Ắc Quy X-PRO 90AH', '90Ah', 1550000, 1750000, 35, '', 1, '12 tháng', ''],
        ['Ắc quy', 'ATLASBX', 'N45LS', '', 'Ắc Quy ATLASBX N45LS (Cọc Thuận)', '45Ah', 780000, 980000, 25, '', 1, '12 tháng', ''],
        ['Ắc quy', 'PINACO', 'NS40', '', 'Ắc Quy PINACO NS40', '40Ah', 800000, 1000000, 16, '', 1, '30 ngày', 'Ắc quy nắp liền (Miễn bảo dưỡng)'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Lấy danh sách sản phẩm từ API.
 */
export const getProducts = async (params = {}) => {
    try {
        const { page = 1, limit = 10, search = '', locationId } = params;
        const { data } = await api.get('/products', {
            params: { page, limit, search: search || undefined, locationId: locationId || undefined },
        });
        return data?.success
            ? data
            : { success: false, data: { products: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } };
    } catch (error) {
        console.error('getProducts error:', error?.response?.data || error);
        return {
            success: false,
            data: { products: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
            message: error?.response?.data?.message || 'Không thể tải danh sách sản phẩm',
        };
    }
};

/**
 * Lấy danh sách Loại hàng và Thương hiệu distinct (cho select).
 */
export const getProductOptions = async () => {
    try {
        const { data } = await api.get('/products/options');
        return data?.success ? data : { success: false, data: { category: [], brand: [] } };
    } catch (error) {
        console.error('getProductOptions error:', error?.response?.data || error);
        return { success: false, data: { category: [], brand: [] } };
    }
};

/**
 * Lấy chi tiết một sản phẩm theo id.
 */
export const getProductById = async (id) => {
    try {
        const { data } = await api.get(`/products/${id}`);
        return data?.success ? data : { success: false, data: { product: null } };
    } catch (error) {
        console.error('getProductById error:', error?.response?.data || error);
        return { success: false, data: { product: null }, message: error?.response?.data?.message };
    }
};

/**
 * Tạo sản phẩm mới.
 */
export const createProduct = async (payload) => {
    try {
        const { data } = await api.post('/products', payload);
        return data;
    } catch (error) {
        console.error('createProduct error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Cập nhật sản phẩm.
 */
export const updateProduct = async (id, payload) => {
    try {
        const { data } = await api.put(`/products/${id}`, payload);
        return data;
    } catch (error) {
        console.error('updateProduct error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Xóa sản phẩm.
 */
export const deleteProduct = async (id) => {
    try {
        const { data } = await api.delete(`/products/${id}`);
        return data;
    } catch (error) {
        console.error('deleteProduct error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Upload một hoặc nhiều ảnh sản phẩm lên Cloudinary.
 * @param {File | File[]} files - Một file hoặc mảng file ảnh (JPEG, PNG, WebP, GIF, tối đa 3MB/file)
 * @returns {Promise<{ success: boolean, data?: { url: string, urls: string[] } }>}
 */
export const uploadProductImage = async (files) => {
    const list = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    list.forEach((file) => formData.append('image', file));
    const { data } = await api.post('/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

/**
 * Cập nhật giá hàng loạt.
 * Payload: { category?, brand?, type: 'margin' | 'percent' | 'fixed', value: number }
 */
export const bulkUpdatePrice = async (payload) => {
    try {
        const { data } = await api.post('/products/bulk-update-price', payload);
        return data;
    } catch (error) {
        console.error('bulkUpdatePrice error:', error?.response?.data || error);
        throw error;
    }
};

/**
 * Import sản phẩm từ file Excel. Cột "Tồn kho" = ProductStock tại locationId (nếu có).
 */
export const importProductsFromExcel = async (file, locationId) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        if (locationId) formData.append('locationId', locationId);
        const { data } = await api.post('/products/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data?.success
            ? data
            : { success: false, message: data?.message || 'Import thất bại', data: data?.data };
    } catch (error) {
        const msg = error?.response?.data?.message || error?.message || 'Import thất bại. Kiểm tra định dạng file.';
        console.error('importProductsFromExcel error:', error?.response?.data || error);
        return {
            success: false,
            message: msg,
            data: { imported: 0, errors: error?.response?.data?.data?.errors || [] },
        };
    }
};
