import XLSX from 'xlsx';

/**
 * 19 cột bắt buộc — cùng thứ tự/ tên với bản mẫu (client `HEADERS`) và file export.
 * Cột thêm ở cuối (không bắt buộc): 'VAT (%)', 'Đang kinh doanh', 'Ghi chú', 'Ngày tạo', 'Ngày cập nhật' (2 cột thời gian import bỏ qua).
 */
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
    'Bảo hành',
    'Chiều dài (mm)',
    'Chiều rộng (mm)',
    'Chiều cao (mm)',
    'Trọng lượng (Kg)',
    'Kiểu ắc quy',
    'Điện áp (V)',
    'Xuất xứ',
];

/** Cột thêm từ export; không cần có hết, không cần đúng thứ tự. */
export const OPTIONAL_TRAILING_EXPORT_HEADERS = ['VAT (%)', 'Đang kinh doanh', 'Ghi chú', 'Ngày tạo', 'Ngày cập nhật'];

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

/** VAT (%) 0–100; rỗng = không gửi (dùng mặc định cửa hàng). */
function parseVatPercentFromCell(value) {
    if (value == null || value === '') return undefined;
    const n = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
    return n;
}

/**
 * Đang kinh doanh: 1/0, Có/Không, (rỗng=đang bán theo mặc định)
 */
function parseIsActiveFromCell(value) {
    if (value === null || value === undefined || value === '') return true;
    if (value === 1) return true;
    if (value === 0) return false;
    const t = String(value).trim();
    if (t === '1' || t === '0') return t === '1';
    const s = stripAccents(t).toLowerCase();
    if (s === 'co' || s === 'yes' || s === 'true') return true; // Có, yes
    if (s === 'khong' || s === 'no' || s === 'false' || s === 'ko') return false; // Không
    if (/^[-\d.]+$/.test(s)) {
        const n = parseFloat(s.replace(/,/g, ''));
        if (n === 0) return false;
        if (n === 1) return true;
    }
    return true;
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

    const inBusiness = pick(row, 'Đang kinh doanh');
    const isActive = parseIsActiveFromCell(inBusiness);

    const notes = row['Ghi chú'] != null ? String(row['Ghi chú']).trim() : '';

    const vatFromRow = pick(row, 'VAT (%)', 'VAT(%)', 'VAT');
    const vatPercent = parseVatPercentFromCell(vatFromRow);

    return {
        categoryName: category,
        usageDeviceName,
        brandName: brand,
        sku: sku || `IM-${index + 1}`,
        barcode: barcode,
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
        dimensionLengthMm,
        dimensionWidthMm,
        dimensionHeightMm,
        weightKg,
        batteryType,
        voltageV,
        originCountry: originCountry || '',
        ...(vatPercent != null ? { vatPercent } : {}),
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
    const headerRowRaw = headerRows[0] || [];
    const headerRow = headerRowRaw.map((c) => (c == null ? '' : String(c).trim()));

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
