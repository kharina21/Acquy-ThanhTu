import XLSX from 'xlsx';

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
 * Parse "12 tháng" -> 12, "30 ngày" -> 0
 */
function parseWarranty(value) {
    if (value == null || value === '') return null;
    const str = String(value).trim();
    const matchMonth = str.match(/(\d+)\s*tháng/i);
    if (matchMonth) return parseInt(matchMonth[1], 10);
    const matchDay = str.match(/(\d+)\s*ngày/i);
    if (matchDay) return 0;
    const num = parseInt(str, 10);
    return Number.isNaN(num) ? null : num;
}

/**
 * Chuyển một dòng Excel (object với key là header) thành object sản phẩm để lưu DB.
 */
export function rowToProduct(row, index) {
    const category = row['Loại hàng'] != null ? String(row['Loại hàng']).trim() : '';
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
    const image = row['Hình ảnh'] != null ? String(row['Hình ảnh']).trim() : '';
    const inBusiness = row['Đang kinh doanh'];
    const isActive = inBusiness === 1 || inBusiness === '1' || String(inBusiness).trim() === '1';
    const warrantyText = row['Bảo hành'] != null ? String(row['Bảo hành']).trim() : '';
    const warrantyMonths = parseWarranty(row['Bảo hành']);
    const notes = row['Ghi chú'] != null ? String(row['Ghi chú']).trim() : '';

    return {
        // các field này chỉ là input để backend map -> Category/Brand ref
        categoryName: category || '',
        brandName: brand || '',
        sku: sku || `IM-${index + 1}`,
        barcode: barcode || '',
        name: name || `Sản phẩm ${index + 1}`,
        capacity: capacity || '',
        costPrice,
        price,
        quantity,
        image: image || '',
        isActive,
        warrantyText: warrantyText || '',
        warrantyMonths,
        notes: notes || '',
    };
}


export function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
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
    return { products, errors };
}
