import StockIn from '../models/StockIn.js';
import StockReturn from '../models/StockReturn.js';
import ProductStock from '../models/ProductStock.js';
import { generateStockInCode } from '../utils/stockInCode.js';
import { syncProductsCostPriceFromConfirmedStockIns } from '../utils/maxImportUnitPriceFromStockIns.js';

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
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
                serials: [],
            };
        });

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
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
                serials: [],
            };
        });

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

        for (const it of stockIn.items) {
            it.serials = [];
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
