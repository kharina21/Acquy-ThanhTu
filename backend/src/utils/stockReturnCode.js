import StockReturn from '../models/StockReturn.js';

/**
 * Sinh mã phiếu trả hàng tiếp theo: TH-YYYYMMDD-XXX
 */
export async function generateStockReturnCode() {
    const today = new Date();
    const prefix = `TH-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-`;
    const last = await StockReturn.findOne({ code: new RegExp(`^${prefix}`) }).sort({ code: -1 }).select('code').lean();
    let seq = 1;
    if (last?.code) {
        const match = last.code.match(/-(\d+)$/);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
}
