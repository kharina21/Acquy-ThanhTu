import StockOut from '../models/StockOut.js';
import ProductStock from '../models/ProductStock.js';
import { generateStockOutCode } from '../utils/stockOutCode.js';
import { validateLocationForUser } from '../libs/managerLocationHelper.js';

/** Loại xuất cho phiếu nhập tay (không gán sale_order từ API này) */
const MANUAL_REASON_TYPES = ['adjustment', 'internal_use', 'damage_loss', 'supplier_return', 'other'];

const parseDocumentDate = (raw) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeManualReasonType = (rt) => {
    if (!rt || rt === 'sale_order') return 'other';
    return MANUAL_REASON_TYPES.includes(rt) ? rt : 'other';
};

export const getNextCode = async (req, res) => {
    try {
        const code = await generateStockOutCode();
        res.status(200).json({ success: true, data: { code } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo mã phiếu xuất', error: error.message });
    }
};

export const getAllStockOuts = async (req, res) => {
    try {
        const { page = 1, limit = 10, locationId, fromDate, toDate, status, code, reasonType, saleChannel } = req.query;
        const filter = {};
        if (locationId) filter.location = locationId;
        if (status) filter.status = status;
        if (reasonType) filter.reasonType = reasonType;
        if (saleChannel === 'online' || saleChannel === 'offline') filter.saleChannel = saleChannel;
        if (fromDate || toDate) {
            filter.createdAt = {};
            if (fromDate) filter.createdAt.$gte = new Date(fromDate);
            if (toDate) filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
        }
        if (code?.trim()) {
            filter.code = { $regex: code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        }

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [stockOuts, total] = await Promise.all([
            StockOut.find(filter)
                .populate('location', 'code name')
                .populate('createdBy', 'firstName lastName')
                .populate('order', 'code channel')
                .populate('items.product', 'name sku barcode image images')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .lean(),
            StockOut.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                stockOuts,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit, 10)),
                },
            },
        });
    } catch (error) {
        console.error('getAllStockOuts error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách phiếu xuất', error: error.message });
    }
};

export const getStockOutById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockOut = await StockOut.findById(id)
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('order', 'code channel status')
            .populate('items.product', 'name sku barcode image images')
            .lean();

        if (!stockOut) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho' });
        }

        res.status(200).json({ success: true, data: { stockOut } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết phiếu xuất', error: error.message });
    }
};

export const createStockOut = async (req, res) => {
    try {
        const { code, location, note, items, reasonType = 'other', documentDate } = req.body;

        if (!location) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh xuất kho' });
        }
        if (!items?.length) {
            return res.status(400).json({ message: 'Vui lòng thêm ít nhất một sản phẩm' });
        }

        const { valid: locOk } = await validateLocationForUser(req.user._id, location);
        if (!locOk) {
            return res.status(403).json({ message: 'Bạn không có quyền tạo phiếu xuất cho chi nhánh này' });
        }

        const finalCode = code?.trim() || (await generateStockOutCode());
        const existing = await StockOut.findOne({ code: finalCode });
        if (existing) {
            return res.status(400).json({ message: 'Mã phiếu xuất đã tồn tại' });
        }

        const processedItems = items.map((it) => {
            const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
            const price = parseFloat(it.unitPrice) || 0;
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
            };
        });
        const totalAmount = processedItems.reduce((sum, it) => sum + it.totalPrice, 0);

        const stockOut = new StockOut({
            code: finalCode,
            location,
            createdBy: req.user._id,
            note: note?.trim() || '',
            status: 'draft',
            reasonType: normalizeManualReasonType(reasonType),
            documentDate: parseDocumentDate(documentDate),
            items: processedItems,
            totalAmount,
        });
        await stockOut.save();

        const populated = await StockOut.findById(stockOut._id)
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku')
            .lean();

        res.status(201).json({
            success: true,
            message: 'Tạo phiếu xuất kho thành công',
            data: { stockOut: populated },
        });
    } catch (error) {
        console.error('createStockOut error:', error.message);
        if (error.code === 11000) {
            const dupKey = error.keyPattern && Object.keys(error.keyPattern)[0];
            const message =
                dupKey === 'order'
                    ? 'Đơn đã có phiếu xuất kho'
                    : dupKey === 'code'
                      ? 'Mã phiếu xuất đã tồn tại'
                      : 'Dữ liệu phiếu xuất bị trùng';
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: 'Lỗi khi tạo phiếu xuất', error: error.message });
    }
};

export const updateStockOut = async (req, res) => {
    try {
        const { id } = req.params;
        const { location, note, items, reasonType, documentDate } = req.body;

        const stockOut = await StockOut.findById(id);
        if (!stockOut) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho' });
        }
        if (stockOut.status === 'confirmed') {
            return res.status(400).json({ message: 'Không thể chỉnh sửa phiếu đã xác nhận' });
        }
        if (stockOut.reasonType === 'sale_order' && stockOut.order) {
            return res.status(400).json({ message: 'Không chỉnh sửa phiếu xuất gắn đơn hàng' });
        }

        if (!location) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh' });
        }
        if (!items?.length) {
            return res.status(400).json({ message: 'Vui lòng thêm ít nhất một sản phẩm' });
        }

        const { valid: locOk } = await validateLocationForUser(req.user._id, location);
        if (!locOk) {
            return res.status(403).json({ message: 'Bạn không có quyền gán phiếu xuất cho chi nhánh này' });
        }

        const processedItems = items.map((it) => {
            const qty = Math.max(1, parseInt(it.quantity, 10) || 0);
            const price = parseFloat(it.unitPrice) || 0;
            return {
                product: it.product,
                quantity: qty,
                unitPrice: price,
                totalPrice: qty * price,
            };
        });
        const totalAmount = processedItems.reduce((sum, it) => sum + it.totalPrice, 0);

        stockOut.location = location;
        stockOut.note = note?.trim() || '';
        stockOut.items = processedItems;
        stockOut.totalAmount = totalAmount;
        if (reasonType !== undefined) {
            stockOut.reasonType = normalizeManualReasonType(reasonType);
        }
        if (documentDate !== undefined) {
            stockOut.documentDate = parseDocumentDate(documentDate);
        }
        await stockOut.save();

        const populated = await StockOut.findById(id)
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku')
            .lean();

        res.status(200).json({ success: true, message: 'Cập nhật phiếu xuất thành công', data: { stockOut: populated } });
    } catch (error) {
        console.error('updateStockOut error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật phiếu xuất', error: error.message });
    }
};

export const deleteStockOut = async (req, res) => {
    try {
        const { id } = req.params;
        const stockOut = await StockOut.findById(id);
        if (!stockOut) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho' });
        }
        if (stockOut.reasonType === 'sale_order' && stockOut.order) {
            return res.status(400).json({ message: 'Không thể xóa phiếu xuất gắn đơn hàng (đơn bán online/tại quầy)' });
        }
        if (stockOut.status === 'confirmed') {
            const locationId = stockOut.location;
            for (const it of stockOut.items) {
                await ProductStock.findOneAndUpdate(
                    { product: it.product, location: locationId },
                    { $inc: { quantity: it.quantity } },
                    { upsert: false }
                );
            }
        }
        await StockOut.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Đã xóa phiếu xuất kho' });
    } catch (error) {
        console.error('deleteStockOut error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa phiếu xuất', error: error.message });
    }
};

export const confirmStockOut = async (req, res) => {
    try {
        const { id } = req.params;
        const stockOut = await StockOut.findById(id);
        if (!stockOut) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho' });
        }
        if (stockOut.status === 'confirmed') {
            return res.status(400).json({ message: 'Phiếu xuất đã được xác nhận' });
        }

        const locationId = stockOut.location;
        for (const it of stockOut.items) {
            const row = await ProductStock.findOne({ product: it.product, location: locationId }).lean();
            const available = row ? row.quantity : 0;
            if (available < it.quantity) {
                return res.status(400).json({
                    message: `Không đủ tồn kho để xuất (sản phẩm ${it.product}). Tồn: ${available}, cần: ${it.quantity}`,
                });
            }
        }

        for (const it of stockOut.items) {
            await ProductStock.findOneAndUpdate(
                { product: it.product, location: locationId },
                { $inc: { quantity: -it.quantity } },
                { upsert: false }
            );
        }

        stockOut.status = 'confirmed';
        stockOut.confirmedAt = new Date();
        await stockOut.save();

        const populated = await StockOut.findById(id)
            .populate('location', 'code name')
            .populate('createdBy', 'firstName lastName')
            .populate('items.product', 'name sku')
            .lean();

        res.status(200).json({
            success: true,
            data: { stockOut: populated },
            message: 'Đã xác nhận phiếu xuất kho và trừ tồn',
        });
    } catch (error) {
        console.error('confirmStockOut error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xác nhận phiếu xuất', error: error.message });
    }
};
