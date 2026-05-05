import StockCheck from '../models/StockCheck.js';

/** Ngày hiện tại theo máy chủ (YYYY-MM-DD). */
export function todayYmdLocal() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Chuẩn hóa YYYY-MM-DD (trim); null nếu không hợp lệ. */
export function normalizeYmd(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return s;
}

/**
 * Sinh mã phiếu kiểm kho tiếp theo: KK-YYYYMMDD-XXX (XXX = số thứ tự trong ngày đó).
 * @param {string|null} ymdStr - YYYY-MM-DD; nếu null/invalid → hôm nay (server local).
 */
export async function generateStockCheckCode(ymdStr = null) {
    const ymd = normalizeYmd(ymdStr) || todayYmdLocal();
    const compact = ymd.replace(/-/g, '');
    const prefix = `KK-${compact}-`;
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const last = await StockCheck.findOne({ code: new RegExp(`^${escaped}`) })
        .sort({ code: -1 })
        .select('code')
        .lean();
    let seq = 1;
    if (last?.code) {
        const match = last.code.match(/-(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
}
