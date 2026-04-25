import mongoose from 'mongoose';
import StockIn from '../models/StockIn.js';
import Product from '../models/Product.js';

/**
 * Với từng sản phẩm: đơn giá nhập tối đa trên các dòng hàng
 * của phiếu nhập hàng trạng thái "confirmed" (mọi chi nhánh).
 * @param {mongoose.Types.ObjectId[]} productObjectIds
 * @returns {Record<string, number|null>} map productId → max unitPrice (làm tròn)
 */
export async function getMaxImportUnitPriceByProductIds(productObjectIds) {
    if (!productObjectIds?.length) return {};
    const rows = await StockIn.aggregate([
        { $match: { status: 'confirmed' } },
        { $unwind: '$items' },
        { $match: { 'items.product': { $in: productObjectIds } } },
        { $group: { _id: '$items.product', maxUnit: { $max: '$items.unitPrice' } } },
    ]);
    return Object.fromEntries(
        rows.map((r) => {
            const v = r.maxUnit;
            return [r._id.toString(), v != null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : null];
        }),
    );
}

function uniqueObjectIds(productIds) {
    const set = new Set();
    for (const id of productIds || []) {
        if (id == null) continue;
        const s = typeof id === 'string' ? id : id.toString?.();
        if (s && mongoose.Types.ObjectId.isValid(s)) set.add(String(s));
    }
    return [...set].map((s) => new mongoose.Types.ObjectId(s));
}

/**
 * Ghi `Product.costPrice` = max đơn giá nhập trên mọi phiếu nhập đã xác nhận (cho từng sản phẩm trong danh sách).
 */
export async function syncProductsCostPriceFromConfirmedStockIns(productIds) {
    const oids = uniqueObjectIds(productIds);
    if (!oids.length) return;
    const maxMap = await getMaxImportUnitPriceByProductIds(oids);
    await Promise.all(
        oids.map(async (oid) => {
            const key = oid.toString();
            const v = maxMap[key];
            if (v != null && Number.isFinite(v)) {
                await Product.findByIdAndUpdate(oid, { costPrice: v });
            }
        }),
    );
}
