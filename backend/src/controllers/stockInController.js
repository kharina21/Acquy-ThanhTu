import crypto from 'crypto';
import StockIn from '../models/StockIn.js';
import StockReturn from '../models/StockReturn.js';
import ProductStock from '../models/ProductStock.js';
import Product from '../models/Product.js';
import { generateStockInCode } from '../utils/stockInCode.js';
import { syncProductsCostPriceFromConfirmedStockIns } from '../utils/maxImportUnitPriceFromStockIns.js';

/**
 * Mỗi dòng: hoặc không nhập seri (0 mã), hoặc phải đúng bằng số lượng — tránh dở dang 3/5 mã.
 */
function assertSerialsCountMatchesQuantity(processedItems) {
    for (let i = 0; i < processedItems.length; i += 1) {
        const it = processedItems[i];
        const q = it.quantity;
        const n = (it.serials || []).length;
        if (n > q) {
            throw Object.assign(
                new Error(
                    `Dòng hàng thứ ${i + 1}: có ${n} seri/IMEI, vượt số lượng (${q}). Hãy xóa bớt hoặc tăng số lượng.`,
                ),
                { statusCode: 400 },
            );
        }
        if (n > 0 && n < q) {
            throw Object.assign(
                new Error(
                    `Dòng hàng thứ ${i + 1}: cần đúng ${q} seri/IMEI (hiện ${n}) — hoặc xóa hết seri nếu không theo dõi từng cái.`,
                ),
                { statusCode: 400 },
            );
        }
    }
}

/** Gom và kiểm tra seri không trùng trong payload và không trùng với phiếu khác / mã SKU sản phẩm. */
async function assertSerialsAllowed(processedItems, excludeStockInId) {
    const flat = [];
    for (const it of processedItems) {
        for (const s of it.serials || []) {
            const v = String(s || '').trim();
            if (v) flat.push(v);
        }
    }
    if (flat.length === 0) return;

    const seen = new Set();
    for (const s of flat) {
        if (seen.has(s)) {
            throw Object.assign(new Error(`Seri "${s}" bị trùng trong cùng phiếu`), { statusCode: 400 });
        }
        seen.add(s);
    }

    const skuHit = await Product.findOne({ sku: { $in: flat } }).select('sku').lean();
    if (skuHit) {
        throw Object.assign(
            new Error(`Seri trùng với mã SKU sản phẩm "${skuHit.sku}" — đổi seri khác`),
            { statusCode: 400 },
        );
    }

    const filter = { items: { $elemMatch: { serials: { $in: flat } } } };
    if (excludeStockInId) filter._id = { $ne: excludeStockInId };
    const conflict = await StockIn.findOne(filter).select('code').lean();
    if (conflict) {
        throw Object.assign(
            new Error(`Seri đã tồn tại trên phiếu nhập khác (${conflict.code})`),
            { statusCode: 400 },
        );
    }
}

/**
 * POST /stock-ins/generate-serials
 * Sinh N mã seri số (đủ chữ số cho barcode), không trùng trong DB và không trùng excludeSerials.
 */
export const generateStockInSerials = async (req, res) => {
    try {
        const qty = Math.min(500, Math.max(1, parseInt(req.body?.quantity, 10) || 0));
        const exclude = Array.isArray(req.body?.excludeSerials)
            ? [...new Set(req.body.excludeSerials.map((s) => String(s || '').trim()).filter(Boolean))]
            : [];
        const used = new Set(exclude);
        const out = [];
        let attempts = 0;
        const maxAttempts = qty * 100;

        while (out.length < qty && attempts < maxAttempts) {
            attempts += 1;
            const buf = crypto.randomBytes(14);
            let s = '';
            for (let j = 0; j < 14; j += 1) s += String(buf[j] % 10);
            if (used.has(s) || out.includes(s)) continue;

            const existsSku = await Product.exists({ sku: s });
            if (existsSku) continue;

            const dup = await StockIn.findOne({
                items: { $elemMatch: { serials: s } },
            })
                .select('_id')
                .lean();
            if (dup) continue;

            out.push(s);
            used.add(s);
        }

        if (out.length < qty) {
            return res.status(500).json({ message: 'Không tạo đủ mã seri duy nhất, thử lại sau' });
        }

        res.status(200).json({ success: true, data: { serials: out } });
    } catch (error) {
        console.error('generateStockInSerials error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo seri', error: error.message });
    }
};

export const getNextCode = async (req, res) => {
    try {
        const code = await generateStockInCode();
        res.status(200).json({ success: true, data: { code } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo mã phiếu nhập', error: error.message });
    }
};

export const getAllStockIns = async (req, res) => {
    try {
        const { page = 1, limit = 10, locationId, fromDate, toDate, status, code, supplierId } = req.query;
        const filter = {};
        if (locationId) filter.location = locationId;
        if (fromDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(fromDate) };
        if (toDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(toDate + 'T23:59:59.999Z') };
        if (status) filter.status = status;
        if (code?.trim()) filter.code = { $regex: code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        if (supplierId) filter.supplier = supplierId;

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [stockIns, total] = await Promise.all([
            StockIn.find(filter)
                .populate('supplier', 'code name')
                .populate('location', 'code name')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .lean(),
            StockIn.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                stockIns,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit, 10)),
                },
            },
        });
    } catch (error) {
        console.error('getAllStockIns error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu nhập', error: error.message });
    }
};

export const getStockInById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockIn = await StockIn.findById(id)
            .populate('supplier', 'code name phone')
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku barcode capacity price')
            .lean();

        if (!stockIn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
        }

        const returns = await StockReturn.find({ stockIn: id }).select('items').lean();
        const returnedByProduct = {};
        for (const r of returns) {
            for (const it of r.items || []) {
                const pid = String(it.product);
                returnedByProduct[pid] = (returnedByProduct[pid] || 0) + (it.quantity || 0);
            }
        }

        res.status(200).json({ success: true, data: { stockIn, returnedByProduct } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết phiếu nhập', error: error.message });
    }
};

export const createStockIn = async (req, res) => {
    try {
        const { code, supplier, location, note, items } = req.body;

        if (!location) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh nhập hàng' });
        }

        if (!items?.length) {
            return res.status(400).json({ message: 'Vui lòng thêm ít nhất một sản phẩm' });
        }

        const finalCode = code?.trim() || (await generateStockInCode());

        const existing = await StockIn.findOne({ code: finalCode });
        if (existing) {
            return res.status(400).json({ message: 'Mã phiếu nhập đã tồn tại' });
        }

        const processedItems = items.map((it) => {
            const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
            const price = parseFloat(it.unitPrice) || 0;
            const serials = Array.isArray(it.serials)
                ? it.serials
                      .map((s) => String(s || '').trim())
                      .filter(Boolean)
                : [];
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
                serials,
            };
        });

        try {
            assertSerialsCountMatchesQuantity(processedItems);
            await assertSerialsAllowed(processedItems, null);
        } catch (e) {
            const status = e.statusCode || 400;
            return res.status(status).json({ message: e.message });
        }

        const totalAmount = processedItems.reduce((sum, it) => sum + it.totalPrice, 0);

        const stockIn = new StockIn({
            code: finalCode,
            supplier: supplier || null,
            location,
            createdBy: req.user._id,
            note: note?.trim() || '',
            status: 'draft',
            items: processedItems,
            totalAmount,
        });

        await stockIn.save();

        const populated = await StockIn.findById(stockIn._id)
            .populate('supplier', 'code name')
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku barcode capacity price')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Tạo phiếu nhập hàng thành công',
            data: { stockIn: populated },
        });
    } catch (error) {
        console.error('createStockIn error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã phiếu nhập đã tồn tại' });
        }
        if (error.statusCode === 400) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi khi tạo phiếu nhập', error: error.message });
    }
};

/**
 * Cập nhật phiếu nhập (chỉ khi status = draft).
 */
export const updateStockIn = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier, location, note, items } = req.body;

        const stockIn = await StockIn.findById(id);
        if (!stockIn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
        }
        if (stockIn.status === 'confirmed') {
            return res.status(400).json({ message: 'Không thể chỉnh sửa phiếu đã xác nhận' });
        }

        if (!location) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh nhập hàng' });
        }

        if (!items?.length) {
            return res.status(400).json({ message: 'Vui lòng thêm ít nhất một sản phẩm' });
        }

        const processedItems = items.map((it) => {
            const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
            const price = parseFloat(it.unitPrice) || 0;
            const serials = Array.isArray(it.serials)
                ? it.serials
                      .map((s) => String(s || '').trim())
                      .filter(Boolean)
                : [];
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
                serials,
            };
        });

        try {
            assertSerialsCountMatchesQuantity(processedItems);
            await assertSerialsAllowed(processedItems, id);
        } catch (e) {
            const status = e.statusCode || 400;
            return res.status(status).json({ message: e.message });
        }

        const totalAmount = processedItems.reduce((sum, it) => sum + it.totalPrice, 0);

        stockIn.supplier = supplier || null;
        stockIn.location = location;
        stockIn.note = note?.trim() || '';
        stockIn.items = processedItems;
        stockIn.totalAmount = totalAmount;
        await stockIn.save();

        const populated = await StockIn.findById(id)
            .populate('supplier', 'code name')
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku barcode capacity price')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Cập nhật phiếu nhập hàng thành công',
            data: { stockIn: populated },
        });
    } catch (error) {
        console.error('updateStockIn error:', error.message);
        if (error.statusCode === 400) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật phiếu nhập', error: error.message });
    }
};

/**
 * Hủy phiếu nhập.
 * - Draft: xóa trực tiếp.
 * - Đã xác nhận: trừ tồn kho (đảo ngược) rồi xóa. Chỉ hủy được khi tồn đủ (chưa trả hoặc trả ít hơn số nhập).
 */
export const deleteStockIn = async (req, res) => {
    try {
        const { id } = req.params;
        const stockIn = await StockIn.findById(id);
        if (!stockIn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
        }

        const productIdsToSyncOnDelete =
            stockIn.status === 'confirmed' ? [...new Set(stockIn.items.map((it) => it.product))] : [];

        if (stockIn.status === 'confirmed') {
            const locationId = stockIn.location;
            const returns = await StockReturn.find({ stockIn: id }).lean();
            const returnedByProduct = {};
            for (const r of returns) {
                for (const it of r.items || []) {
                    const pid = String(it.product);
                    returnedByProduct[pid] = (returnedByProduct[pid] || 0) + (it.quantity || 0);
                }
            }
            for (const it of stockIn.items) {
                const pid = String(it.product);
                const toReverse = it.quantity - (returnedByProduct[pid] || 0);
                if (toReverse <= 0) continue;
                const ps = await ProductStock.findOne({ product: it.product, location: locationId }).lean();
                const available = ps?.quantity ?? 0;
                if (available < toReverse) {
                    return res.status(400).json({
                        message: `Không thể hủy: tồn kho không đủ (sản phẩm ${it.product}). Tồn: ${available}, cần trừ: ${toReverse}`,
                    });
                }
            }
            for (const it of stockIn.items) {
                const pid = String(it.product);
                const toReverse = it.quantity - (returnedByProduct[pid] || 0);
                if (toReverse <= 0) continue;
                await ProductStock.findOneAndUpdate(
                    { product: it.product, location: locationId },
                    { $inc: { quantity: -toReverse } },
                    { upsert: false }
                );
            }
            await StockReturn.deleteMany({ stockIn: id });
        }

        await StockIn.findByIdAndDelete(id);
        if (productIdsToSyncOnDelete.length) {
            await syncProductsCostPriceFromConfirmedStockIns(productIdsToSyncOnDelete);
        }
        res.status(200).json({ success: true, message: 'Đã hủy phiếu nhập hàng' });
    } catch (error) {
        console.error('deleteStockIn error:', error.message);
        res.status(500).json({ message: 'Lỗi khi hủy phiếu nhập', error: error.message });
    }
};

/**
 * Xác nhận phiếu nhập: cộng tồn vào ProductStock tại chi nhánh.
 */
export const confirmStockIn = async (req, res) => {
    try {
        const { id } = req.params;
        const stockIn = await StockIn.findById(id);
        if (!stockIn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
        }
        if (stockIn.status === 'confirmed') {
            return res.status(400).json({ message: 'Phiếu nhập hàng đã được xác nhận' });
        }

        const draftItems = stockIn.items.map((it) => ({
            quantity: it.quantity,
            serials: (it.serials || []).map((s) => String(s || '').trim()).filter(Boolean),
        }));
        try {
            assertSerialsCountMatchesQuantity(draftItems);
        } catch (e) {
            return res.status(e.statusCode || 400).json({ message: e.message });
        }

        const locationId = stockIn.location;
        for (const it of stockIn.items) {
            await ProductStock.findOneAndUpdate(
                { product: it.product, location: locationId },
                { $inc: { quantity: it.quantity } },
                { upsert: true, new: true }
            );
        }

        stockIn.status = 'confirmed';
        stockIn.confirmedAt = new Date();
        await stockIn.save();

        const productIdsToSync = [...new Set(stockIn.items.map((it) => it.product))];
        await syncProductsCostPriceFromConfirmedStockIns(productIdsToSync);

        const populated = await StockIn.findById(id)
            .populate('supplier', 'code name')
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku barcode capacity price')
            .lean();

        res.status(200).json({
            success: true,
            data: { stockIn: populated },
            message: 'Đã xác nhận phiếu nhập hàng và cập nhật tồn kho',
        });
    } catch (error) {
        console.error('confirmStockIn error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xác nhận phiếu nhập', error: error.message });
    }
};
