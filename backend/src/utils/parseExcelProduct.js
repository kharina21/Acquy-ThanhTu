import XLSX from 'xlsx';

// Danh sách header bắt buộc (phải khớp đúng với file mẫu)
export const EXPECTED_HEADERS = [
    'Loại hàng',
    'Thiết bị sử dụng',
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
 * Chuẩn hóa số từ ô Excel (VN: 1.550.000 -> 1550000)
 */
function parsePrice(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value);
    const str = String(value).replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    const num = parseFloat(str);
    return Number.isNaN(num) ? 0 : Math.round(num);
}

/**
 * Chuyển một dòng Excel (object với key là header) thành object sản phẩm để lưu DB.
 * Cột "Bảo hành": chỉ lưu text (VD: 12 tháng, 1 năm, 15 ngày), không parse số.
 */
export function rowToProduct(row, index) {
    const category = row['Loại hàng'] != null ? String(row['Loại hàng']).trim() : '';
    const usageDeviceName = row['Thiết bị sử dụng'] != null ? String(row['Thiết bị sử dụng']).trim() : '';
    const brand = row['Thương hiệu'] != null ? String(row['Thương hiệu']).trim() : '';
    const sku = row['Mã hàng'] != null ? String(row['Mã hàng']).trim() : '';
    const barcode = row['Mã vạch'] != null ? String(row['Mã vạch']).trim() : '';
    const name = row['Tên hàng'] != null ? String(row['Tên hàng']).trim() : '';
    const capacity = row['Dung lượng (Ah)'] != null ? String(row['Dung lượng (Ah)']).trim() : '';
    const costPrice = parsePrice(row['Đơn giá nhập (VNĐ)']);
    const price = parsePrice(row['Đơn giá bán (VNĐ)']);
    const quantityRaw = row['Tồn kho'];
    const quantity =
        quantityRaw != null && quantityRaw !== ''
            ? typeof quantityRaw === 'number'
                ? quantityRaw
                : parseInt(String(quantityRaw).replace(/\s/g, ''), 10) || 0
            : 0;
    const imageRaw = row['Hình ảnh'] != null ? String(row['Hình ảnh']).trim() : '';
    const images = imageRaw
        ? imageRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    const image = images[0] || '';
    const inBusiness = row['Đang kinh doanh'];
    const isActive = inBusiness === 1 || inBusiness === '1' || String(inBusiness).trim() === '1';
    const warrantyText = row['Bảo hành'] != null ? String(row['Bảo hành']).trim() : '';
    const notes = row['Ghi chú'] != null ? String(row['Ghi chú']).trim() : '';

    return {
        categoryName: category || '',
        usageDeviceName: usageDeviceName || '',
        brandName: brand || '',
        sku: sku || `IM-${index + 1}`,
        barcode: barcode || '',
        name: name || `Sản phẩm ${index + 1}`,
        capacity: capacity || '',
        costPrice,
        price,
        quantity,
        image: image || '',
        images: images || [],
        isActive,
        warrantyText: warrantyText || '',
        notes: notes || '',
    };
}


export function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    // Đọc riêng dòng header để kiểm tra định dạng
    const headerRows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        range: 0,
        blankrows: false,
    });
    const headerRow = headerRows[0] || [];

    if (!headerRow.length) {
        const errors = [{ row: 1, message: 'File Excel trống hoặc không có dòng tiêu đề (header).' }];
        return { products: [], errors, headerError: true };
    }

    const missingHeaders = EXPECTED_HEADERS.filter((h) => !headerRow.includes(h));
    if (missingHeaders.length > 0) {
        const errors = [
            {
                row: 1,
                message: `File Excel không đúng định dạng. Thiếu các cột: ${missingHeaders.join(', ')}. Hãy tải lại file mẫu và nhập đúng các cột này.`,
            },
        ];
        return { products: [], errors, headerError: true };
    }

    const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    const products = [];
    const errors = [];
    data.forEach((row, index) => {
        try {
            products.push(rowToProduct(row, index));
        } catch (err) {
            errors.push({ row: index + 2, message: err.message || 'Lỗi dòng' });
        }
    });
    return { products, errors, headerError: false };
}
