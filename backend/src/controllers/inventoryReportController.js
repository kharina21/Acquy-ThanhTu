import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductStock from '../models/ProductStock.js';
import StockIn from '../models/StockIn.js';
import StockOut from '../models/StockOut.js';
import StockReturn from '../models/StockReturn.js';
import StockCheck from '../models/StockCheck.js';

/** Một khóa duy nhất cho map/set (aggregate vs lean đều về cùng dạng 24 hex). */
function productIdKey(id) {
    if (id == null) return null;
    try {
        if (id instanceof mongoose.Types.ObjectId) return id.toHexString();
        if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id).toHexString();
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * Báo cáo xuất – nhập – tồn theo kỳ (một chi nhánh).
 * Tồn đầu kỳ được suy ra: tồn cuối hiện tại − nhập + xuất + trả NCC − chênh lệch kiểm kho trong kỳ.
 * Tham khảo cấu trúc sổ NXT: https://1office.vn/bang-xuat-nhap-ton-hang-hoa-hang-ngay
 */
export const getNxtReport = async (req, res) => {
    try {
        const { locationId, fromDate, toDate } = req.query;
        if (!locationId || !fromDate || !toDate) {
            return res.status(400).json({ message: 'Cần locationId, fromDate và toDate (YYYY-MM-DD)' });
        }

        const from = new Date(fromDate);
        const to = new Date(toDate + 'T23:59:59.999Z');
        if (from > to) {
            return res.status(400).json({ message: 'fromDate không được sau toDate' });
        }

        const locOid = new mongoose.Types.ObjectId(locationId);
        const dateExpr = {
            $and: [
                { $gte: [{ $ifNull: ['$confirmedAt', '$updatedAt'] }, from] },
                { $lte: [{ $ifNull: ['$confirmedAt', '$updatedAt'] }, to] },
            ],
        };

        const [inboundAgg, outboundAgg, returnAgg, checkAgg] = await Promise.all([
            StockIn.aggregate([
                {
                    $match: {
                        location: locOid,
                        status: 'confirmed',
                        $expr: dateExpr,
                    },
                },
                { $unwind: '$items' },
                { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
            ]),
            StockOut.aggregate([
                {
                    $match: {
                        location: locOid,
                        status: 'confirmed',
                        $expr: dateExpr,
                    },
                },
                { $unwind: '$items' },
                { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
            ]),
            StockReturn.aggregate([
                {
                    $match: {
                        location: locOid,
                        createdAt: { $gte: from, $lte: to },
                    },
                },
                { $unwind: '$items' },
                { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
            ]),
            StockCheck.aggregate([
                {
                    $match: {
                        location: locOid,
                        status: 'confirmed',
                        $expr: dateExpr,
                    },
                },
                { $unwind: '$items' },
                { $group: { _id: '$items.product', adjustment: { $sum: '$items.quantityChange' } } },
            ]),
        ]);

        const toMap = (arr, keyField = 'qty') => {
            const m = {};
            for (const row of arr) {
                const key = productIdKey(row._id);
                if (!key) continue;
                m[key] = row[keyField] ?? row.qty ?? 0;
            }
            return m;
        };

        const inMap = toMap(inboundAgg);
        const outMap = toMap(outboundAgg);
        const retMap = toMap(returnAgg);
        const adjMap = toMap(checkAgg, 'adjustment');

        /** Không dùng populate: sản phẩm đã xóa sẽ là null và gây lỗi khi đọc product._id. */
        const stockRows = await ProductStock.find({ location: locationId })
            .select('product quantity reservedOnlineQty')
            .lean();

        const productIdSet = new Set();
        for (const r of stockRows) {
            const key = productIdKey(r.product);
            if (key) productIdSet.add(key);
        }
        for (const k of Object.keys(inMap)) productIdSet.add(k);
        for (const k of Object.keys(outMap)) productIdSet.add(k);
        for (const k of Object.keys(retMap)) productIdSet.add(k);
        for (const k of Object.keys(adjMap)) productIdSet.add(k);

        const productOids = [...productIdSet].map((hex) => new mongoose.Types.ObjectId(hex));
        /** Chỉ sản phẩm còn trong danh mục (giống getAllProducts: isDeleted: false). */
        const productDocs = await Product.find({ _id: { $in: productOids }, isDeleted: false })
            .select('sku name')
            .lean();
        const prodById = Object.fromEntries(productDocs.map((p) => [productIdKey(p._id), p]));

        const closingByProduct = {};
        for (const r of stockRows) {
            const pid = productIdKey(r.product);
            if (!pid) continue;
            closingByProduct[pid] = {
                closingQty: r.quantity || 0,
                reservedOnlineQty: r.reservedOnlineQty || 0,
                product: prodById[pid] ?? null,
            };
        }

        const rows = [];
        for (const pid of productIdSet) {
            const product = prodById[pid];
            if (!product) continue;

            const nhap = inMap[pid] || 0;
            const xuat = outMap[pid] || 0;
            const traNcc = retMap[pid] || 0;
            const dieuChinh = adjMap[pid] || 0;
            const meta = closingByProduct[pid];
            const closingQty = meta?.closingQty ?? 0;
            const openingQty = closingQty - nhap + xuat + traNcc - dieuChinh;

            if (nhap === 0 && xuat === 0 && traNcc === 0 && dieuChinh === 0 && closingQty === 0) {
                continue;
            }

            rows.push({
                productId: pid,
                sku: product.sku || '—',
                name: product.name || '—',
                openingQty,
                inboundQty: nhap,
                outboundQty: xuat,
                returnToSupplierQty: traNcc,
                stockCheckAdjustment: dieuChinh,
                closingQty,
                reservedOnlineQty: meta?.reservedOnlineQty ?? 0,
            });
        }

        rows.sort((a, b) => (a.sku || '').localeCompare(b.sku || '', 'vi'));

        res.status(200).json({
            success: true,
            data: {
                locationId,
                fromDate,
                toDate,
                rows,
                note: 'Chỉ hiển thị sản phẩm còn trong danh mục (chưa xóa mềm). Xuất kho trong kỳ gồm phiếu xuất đã xác nhận: bán tại quầy (tự động), bán online (sau xác nhận kho), và phiếu xuất điều chỉnh.',
            },
        });
    } catch (error) {
        console.error('getNxtReport error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo NXT', error: error.message });
    }
};

function assertLocationReportRange(req) {
    const { locationId, fromDate, toDate } = req.query;
    if (!locationId || !fromDate || !toDate) {
        return { error: { status: 400, message: 'Cần locationId, fromDate và toDate (YYYY-MM-DD)' } };
    }
    const from = new Date(fromDate);
    const to = new Date(`${toDate}T23:59:59.999Z`);
    if (from > to) {
        return { error: { status: 400, message: 'fromDate không được sau toDate' } };
    }
    const locOid = new mongoose.Types.ObjectId(locationId);
    const dateExpr = {
        $and: [
            { $gte: [{ $ifNull: ['$confirmedAt', '$updatedAt'] }, from] },
            { $lte: [{ $ifNull: ['$confirmedAt', '$updatedAt'] }, to] },
        ],
    };
    return { locationId, fromDate, toDate, from, to, locOid, dateExpr };
}

/** Báo cáo chi tiết dòng nhập (phiếu đã xác nhận). Mã đơn = mã phiếu nhập (chưa có liên kết PO). */
export const getStockInLinesReport = async (req, res) => {
    try {
        const parsed = assertLocationReportRange(req);
        if (parsed.error) {
            return res.status(parsed.error.status).json({ message: parsed.error.message });
        }
        const { locationId, fromDate, toDate, locOid, dateExpr } = parsed;

        const stockIns = await StockIn.find({
            location: locOid,
            status: 'confirmed',
            $expr: dateExpr,
        })
            .select('code note items confirmedAt updatedAt')
            .populate('items.product', 'sku name isDeleted')
            .sort({ confirmedAt: 1, updatedAt: 1, code: 1 })
            .lean();

        const rows = [];
        for (const doc of stockIns) {
            const docDate = doc.confirmedAt || doc.updatedAt;
            const orderCode = doc.code || '—';
            const slipNote = (doc.note || '').trim();
            for (const it of doc.items || []) {
                const p = it.product;
                if (!p || p.isDeleted) continue;
                const qty = Number(it.quantity) || 0;
                const unit = Number(it.unitPrice) || 0;
                const lineTotal =
                    it.totalPrice != null && it.totalPrice !== ''
                        ? Number(it.totalPrice)
                        : Math.round(qty * unit) || 0;
                rows.push({
                    voucherId: String(doc._id),
                    voucherCode: doc.code,
                    orderCode,
                    docDate: docDate ? new Date(docDate).toISOString() : null,
                    productSku: p.sku || '—',
                    productName: p.name || '—',
                    quantity: qty,
                    unitPrice: unit,
                    lineTotal,
                    note: slipNote,
                });
            }
        }

        rows.sort((a, b) => {
            const ta = new Date(a.docDate || 0).getTime();
            const tb = new Date(b.docDate || 0).getTime();
            if (ta !== tb) return ta - tb;
            return String(a.orderCode).localeCompare(String(b.orderCode), 'vi');
        });

        res.status(200).json({
            success: true,
            data: {
                locationId,
                fromDate,
                toDate,
                rows,
                note: 'Chỉ phiếu nhập đã xác nhận trong kỳ. Cột mã đơn hàng hiển thị mã phiếu nhập (hệ thống chưa gắn đơn mua riêng). Chỉ dòng sản phẩm còn trong danh mục.',
            },
        });
    } catch (error) {
        console.error('getStockInLinesReport error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo nhập hàng', error: error.message });
    }
};

/** Báo cáo chi tiết dòng xuất (phiếu đã xác nhận). Mã đơn = mã đơn bán (nếu có) hoặc mã phiếu xuất. */
export const getStockOutLinesReport = async (req, res) => {
    try {
        const parsed = assertLocationReportRange(req);
        if (parsed.error) {
            return res.status(parsed.error.status).json({ message: parsed.error.message });
        }
        const { locationId, fromDate, toDate, locOid, dateExpr } = parsed;

        const stockOuts = await StockOut.find({
            location: locOid,
            status: 'confirmed',
            $expr: dateExpr,
        })
            .select('code note items confirmedAt updatedAt order reasonType')
            .populate('items.product', 'sku name isDeleted')
            .populate('order', 'code')
            .sort({ confirmedAt: 1, updatedAt: 1, code: 1 })
            .lean();

        const rows = [];
        for (const doc of stockOuts) {
            const docDate = doc.confirmedAt || doc.updatedAt;
            const orderCode = doc.order?.code || doc.code || '—';
            const slipNote = (doc.note || '').trim();
            for (const it of doc.items || []) {
                const p = it.product;
                if (!p || p.isDeleted) continue;
                const qty = Number(it.quantity) || 0;
                const unit = Number(it.unitPrice) || 0;
                const lineTotal =
                    it.totalPrice != null && it.totalPrice !== ''
                        ? Number(it.totalPrice)
                        : Math.round(qty * unit) || 0;
                rows.push({
                    voucherId: String(doc._id),
                    voucherCode: doc.code,
                    orderCode,
                    docDate: docDate ? new Date(docDate).toISOString() : null,
                    productSku: p.sku || '—',
                    productName: p.name || '—',
                    quantity: qty,
                    unitPrice: unit,
                    lineTotal,
                    note: slipNote,
                });
            }
        }

        rows.sort((a, b) => {
            const ta = new Date(a.docDate || 0).getTime();
            const tb = new Date(b.docDate || 0).getTime();
            if (ta !== tb) return ta - tb;
            return String(a.orderCode).localeCompare(String(b.orderCode), 'vi');
        });

        res.status(200).json({
            success: true,
            data: {
                locationId,
                fromDate,
                toDate,
                rows,
                note: 'Chỉ phiếu xuất đã xác nhận trong kỳ. Cột mã đơn hàng: mã đơn bán khi xuất theo đơn, không thì mã phiếu xuất. Chỉ dòng sản phẩm còn trong danh mục.',
            },
        });
    } catch (error) {
        console.error('getStockOutLinesReport error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo xuất kho', error: error.message });
    }
};
