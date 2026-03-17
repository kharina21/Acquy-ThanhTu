import StockIn from '../models/StockIn.js';

/**
 * Sinh mã phiếu nhập hàng tiếp theo: NH-YYYYMMDD-XXX
 */
export async function generateStockInCode() {
    const today = new Date();
    const prefix = `NH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-`;
    const last = await StockIn.findOne({ code: new RegExp(`^${prefix}`) }).sort({ code: -1 }).select('code').lean();
    let seq = 1;
    if (last?.code) {
        const match = last.code.match(/-(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
}
