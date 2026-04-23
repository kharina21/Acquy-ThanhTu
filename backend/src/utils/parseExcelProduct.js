import XLSX from 'xlsx';

// Khớp file mẫu tải từ trang sản phẩm. Có thể thêm cột ngoài danh sách: Series, Đang kinh doanh, Ghi chú.
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
    'Dung tích nhớt',
    'Bảo hành',
    'Chiều dài (mm)',
    'Chiều rộng (mm)',
    'Chiều cao (mm)',
    'Trọng lượng (Kg)',
    'Kiểu ắc quy',
    'Điện áp (V)',
    'Xuất xứ',
    'Đời xe',
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
 * Số từ Excel (kích thước, V, kg)
 */
function parseNumberOpt(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const t = String(value)
        .trim()
        .replace(/\s/g, '');
    if (t === '') return null;
    const n = parseFloat(t.replace(/\./g, '').replace(/,/g, '.'));
    return Number.isFinite(n) ? n : null;
}

function stripAccents(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Cột "Kiểu ắc quy": Khô / Nước → dry / wet
 */
function parseBatteryTypeVi(value) {
    if (value == null || value === '') return null;
    const a = stripAccents(String(value).trim());
    if (a === 'kho' || a === 'dry') return 'dry';
    if (a === 'nuoc' || a === 'wet' || a === 'uot') return 'wet';
    return null;
}

/** Cùng tên cột, thử tên dự phòng (không cách, viết tắt) */
function pick(row, ...keys) {
    for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(row, k)) {
            const v = row[k];
            if (v !== undefined && v !== null && v !== '') return v;
            if (v === 0) return 0;
        }
    }
    return undefined;
}

/**
 * Chuyển một dòng Excel thành object cho DB (kèm categoryName, brandName… xử lý ở controller).
 */
export function rowToProduct(row, index) {
    const category = String(row['Loại hàng'] ?? '').trim();
    const usageDeviceName = String(row['Thiết bị sử dụng'] ?? '').trim();
    const brand = String(row['Thương hiệu'] ?? '').trim();
    const sku = String(row['Mã hàng'] ?? '').trim();
    const barcode = String(row['Mã vạch'] ?? '').trim();
    const name = String(row['Tên hàng'] ?? '').trim();
    const series = row['Series'] != null ? String(row['Series']).trim() : '';
    const capacity = String(row['Dung lượng (Ah)'] ?? '').trim();
    const costPrice = parsePrice(row['Đơn giá nhập (VNĐ)']);
    const price = parsePrice(row['Đơn giá bán (VNĐ)']);
    const quantityRaw = row['Tồn kho'];
    const quantity =
        quantityRaw != null && quantityRaw !== ''
            ? typeof quantityRaw === 'number'
                ? quantityRaw
                : parseInt(String(quantityRaw).replace(/\s/g, ''), 10) || 0
            : 0;
    const imageRaw = String(row['Hình ảnh'] ?? '').trim();
    const images = imageRaw
        ? imageRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    const image = images[0] || '';

    const oilCapacityText = String(row['Dung tích nhớt'] ?? '').trim();
    const warrantyText = String(row['Bảo hành'] ?? '').trim();

    const dimensionLengthMm = parseNumberOpt(
        pick(row, 'Chiều dài (mm)', 'Chiều dài(mm)'),
    );
    const dimensionWidthMm = parseNumberOpt(
        pick(row, 'Chiều rộng (mm)', 'Chiều rộng(mm)'),
    );
    const dimensionHeightMm = parseNumberOpt(
        pick(row, 'Chiều cao (mm)', 'Chiều cao(mm)'),
    );
    const weightKg = parseNumberOpt(
        pick(row, 'Trọng lượng (Kg)', 'Trọng lượng (kg)', 'Trọng lượng(Kg)'),
    );
    const batteryType = parseBatteryTypeVi(pick(row, 'Kiểu ắc quy'));
    const voltageV = parseNumberOpt(pick(row, 'Điện áp (V)', 'Điện áp(V)'));
    const originCountry = String(row['Xuất xứ'] ?? '').trim();
    const vehicleModelText = String(row['Đời xe'] ?? '').trim();

    const inBusiness = pick(row, 'Đang kinh doanh');
    const isActive =
        inBusiness === null || inBusiness === undefined || inBusiness === ''
            ? true
            : inBusiness === 1 || inBusiness === '1' || String(inBusiness).trim() === '1';

    const notes = row['Ghi chú'] != null ? String(row['Ghi chú']).trim() : '';

    return {
        categoryName: category,
        usageDeviceName,
        brandName: brand,
        sku: sku || `IM-${index + 1}`,
        barcode: barcode,
        name: name || `Sản phẩm ${index + 1}`,
        series: series || '',
        capacity: capacity || '',
        costPrice,
        price,
        quantity,
        image: image || '',
        images: images || [],
        isActive,
        warrantyText: warrantyText || '',
        oilCapacityText: oilCapacityText || '',
        vehicleModelText: vehicleModelText || '',
        notes: notes || '',
        dimensionLengthMm,
        dimensionWidthMm,
        dimensionHeightMm,
        weightKg,
        batteryType,
        voltageV,
        originCountry: originCountry || '',
    };
}

export function parseExcelBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

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
                message: `File Excel không đúng định dạng. Thiếu các cột: ${missingHeaders.join(', ')}. Hãy tải lại file mẫu mới nhất từ trang sản phẩm và dùng đúng tên cột (khoảng trắng, dấu ngoặc).`,
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
