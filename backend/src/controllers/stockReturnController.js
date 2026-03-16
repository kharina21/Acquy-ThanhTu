import StockReturn from '../models/StockReturn.js';
import StockIn from '../models/StockIn.js';
import ProductStock from '../models/ProductStock.js';
import { generateStockReturnCode } from '../utils/stockReturnCode.js';

export const getAllStockReturns = async (req, res) => {
    try {
        const { page = 1, limit = 10, locationId, fromDate, toDate, stockInId, code, stockInCode, supplierId } = req.query;
        const filter = {};
        if (locationId) filter.location = locationId;
        if (stockInId) filter.stockIn = stockInId;
        if (fromDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(fromDate) };
        if (toDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(toDate + 'T23:59:59.999Z') };
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (code?.trim()) filter.code = { $regex: escapeRegex(code.trim()), $options: 'i' };
        if (!stockInId && (stockInCode?.trim() || supplierId)) {
            const stockInFilter = {};
            if (stockInCode?.trim()) stockInFilter.code = { $regex: escapeRegex(stockInCode.trim()), $options: 'i' };
            if (supplierId) stockInFilter.supplier = supplierId;
            const stockInIds = await StockIn.find(stockInFilter).select('_id').lean();
            const ids = stockInIds.map((s) => s._id);
            filter.stockIn = { $in: ids };
        }

        const limitNum = stockInId ? 100 : parseInt(limit, 10);
        const skip = stockInId ? 0 : (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [stockReturns, total] = await Promise.all([
            StockReturn.find(filter)
                .populate({
                    path: 'stockIn',
                    populate: { path: 'supplier', select: 'code name' },
                })
                .populate('location', 'code name')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            StockReturn.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                stockReturns,
                pagination: {
                    page: stockInId ? 1 : parseInt(page, 10),
                    limit: limitNum,
                    total,
                    totalPages: stockInId ? 1 : Math.ceil(total / parseInt(limit, 10)),
                },
            },
        });
    } catch (error) {
        console.error('getAllStockReturns error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu trả hàng', error: error.message });
    }
};

export const getStockReturnById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockReturn = await StockReturn.findById(id)
            .populate({ path: 'stockIn', select: 'code supplier', populate: { path: 'supplier', select: 'code name' } })
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku')
            .lean();

        if (!stockReturn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu trả hàng' });
        }

        res.status(200).json({ success: true, data: { stockReturn } });
    } catch (error) {
        console.error('getStockReturnById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết phiếu trả hàng', error: error.message });
    }
};

export const getNextCode = async (req, res) => {
    try {
        const code = await generateStockReturnCode();
        res.status(200).json({ success: true, data: { code } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo mã phiếu trả hàng', error: error.message });
    }
};

export const createStockReturn = async (req, res) => {
    try {
        const { code, stockInId, note, items } = req.body;

        const stockIn = await StockIn.findById(stockInId)
            .populate('location', 'code name')
            .populate('items.product', 'name sku')
            .lean();
        if (!stockIn) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu nhập hàng' });
        }
        if (stockIn.status !== 'confirmed') {
            return res.status(400).json({ message: 'Chỉ được trả hàng từ phiếu nhập đã xác nhận' });
        }

        if (!items?.length) {
            return res.status(400).json({ message: 'Vui lòng chọn ít nhất một sản phẩm để trả' });
        }

        const locationId = stockIn.location?._id || stockIn.location;
        const importedByProduct = {};
        for (const it of stockIn.items) {
            const pid = String(it.product?._id || it.product);
            importedByProduct[pid] = (importedByProduct[pid] || 0) + (it.quantity || 0);
        }

        const existingReturns = await StockReturn.find({ stockIn: stockInId }).lean();
        const returnedByProduct = {};
        for (const r of existingReturns) {
            for (const it of r.items || []) {
                const pid = String(it.product);
                returnedByProduct[pid] = (returnedByProduct[pid] || 0) + (it.quantity || 0);
            }
        }

        const processedItems = [];
        for (const it of items) {
            const pid = it.product?._id || it.product;
            const pidStr = String(pid);
            const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
            const imported = importedByProduct[pidStr] || 0;
            const alreadyReturned = returnedByProduct[pidStr] || 0;
            const maxReturnable = Math.max(0, imported - alreadyReturned);
            if (qty > maxReturnable) {
                const productName = stockIn.items?.find((i) => String(i.product?._id || i.product) === pidStr)?.product?.name || pid;
                return res.status(400).json({
                    message: `Số lượng trả vượt quá số còn lại được trả. Đã nhập: ${imported}, đã trả: ${alreadyReturned}, còn lại: ${maxReturnable} (${productName})`,
                });
            }
            const stock = await ProductStock.findOne({ product: pid, location: locationId }).lean();
            const available = stock?.quantity ?? 0;
            if (qty > available) {
                return res.status(400).json({
                    message: `Tồn kho không đủ để trả (sản phẩm ${pid}: tồn ${available})`,
                });
            }
            processedItems.push({
                product: pid,
                quantity: qty,
                reason: it.reason?.trim() || '',
            });
        }

        const finalCode = code?.trim() || (await generateStockReturnCode());
        const existing = await StockReturn.findOne({ code: finalCode });
        if (existing) {
            return res.status(400).json({ message: 'Mã phiếu trả hàng đã tồn tại' });
        }

        const stockReturn = new StockReturn({
            code: finalCode,
            stockIn: stockInId,
            location: locationId,
            createdBy: req.user._id,
            note: note?.trim() || '',
            items: processedItems,
        });
        await stockReturn.save();

        for (const it of processedItems) {
            await ProductStock.findOneAndUpdate(
                { product: it.product, location: locationId },
                { $inc: { quantity: -it.quantity } },
                { upsert: false }
            );
        }

        const populated = await StockReturn.findById(stockReturn._id)
            .populate('stockIn', 'code')
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Tạo phiếu trả hàng thành công',
            data: { stockReturn: populated },
        });
    } catch (error) {
        console.error('createStockReturn error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã phiếu trả hàng đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo phiếu trả hàng', error: error.message });
    }
};
