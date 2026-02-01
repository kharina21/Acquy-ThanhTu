import StockCheck from '../models/StockCheck.js';
import Product from '../models/Product.js';
import { generateStockCheckCode } from '../utils/stockCheckCode.js';

/**
 * Tạo mã kiểm kho: KK-YYYYMMDD-XXX (XXX = số thứ tự trong ngày, 3 chữ số).
 */
export const getNextCode = async (req, res) => {
    try {
        const code = await generateStockCheckCode();
        res.status(200).json({ success: true, data: { code } });
    } catch (error) {
        console.error('getNextCode error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo mã kiểm kho', error: error.message });
    }
};

/**
 * Danh sách phiếu kiểm kho (phân trang).
 * Query: page, limit, fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD), brand, category
 */
export const getAllStockChecks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const fromDate = req.query.fromDate?.trim();
        const toDate = req.query.toDate?.trim();
        const brand = req.query.brand?.trim();
        const category = req.query.category?.trim();
        const skip = (page - 1) * limit;

        const query = {};

        if (fromDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            query.createdAt = query.createdAt || {};
            query.createdAt.$gte = start;
        }
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            query.createdAt = query.createdAt || {};
            query.createdAt.$lte = end;
        }

        if (brand || category) {
            const productQuery = {};
            if (brand) productQuery.brand = brand;
            if (category) productQuery.category = category;
            const productIds = await Product.find(productQuery).distinct('_id');
            if (productIds.length > 0) {
                query['items.product'] = { $in: productIds };
            } else {
                query['items.product'] = { $in: [] };
            }
        }

        const [list, total] = await Promise.all([
            StockCheck.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'firstName lastName username')
                .lean(),
            StockCheck.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: {
                stockChecks: list,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (error) {
        console.error('getAllStockChecks error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách kiểm kho', error: error.message });
    }
};

/**
 * Chi tiết một phiếu kiểm kho (có populate product trong items).
 */
export const getStockCheckById = async (req, res) => {
    try {
        const { id } = req.params;
        const stockCheck = await StockCheck.findById(id)
            .populate('createdBy', 'firstName lastName username')
            .populate('items.product')
            .lean();
        if (!stockCheck) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kho' });
        }
        res.status(200).json({ success: true, data: { stockCheck } });
    } catch (error) {
        console.error('getStockCheckById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết kiểm kho', error: error.message });
    }
};

/**
 * Tạo phiếu kiểm kho.
 * Body: { code, note?, items: [{ productId, quantityCounted }] }
 * Hệ thống tự lấy quantityBefore, unitPrice (costPrice) từ Product và tính quantityChange, valueChange.
 */
export const createStockCheck = async (req, res) => {
    try {
        const userId = req.user._id;
        const { code, note, items } = req.body;

        if (!code || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mã phiếu và ít nhất một sản phẩm' });
        }

        const existingCode = await StockCheck.findOne({ code: code.trim() });
        if (existingCode) {
            return res.status(400).json({ message: 'Mã phiếu kiểm kho đã tồn tại' });
        }

        const processedItems = [];
        for (const it of items) {
            const productId = it.productId;
            const quantityCounted = Number(it.quantityCounted) ?? 0;
            const product = await Product.findById(productId).lean();
            if (!product) continue;
            const quantityBefore = product.quantity ?? 0;
            const quantityChange = quantityCounted - quantityBefore;
            const unitPrice = product.costPrice ?? product.price ?? 0;
            const valueChange = quantityChange * unitPrice;
            processedItems.push({
                product: productId,
                quantityBefore,
                quantityCounted,
                quantityChange,
                unitPrice,
                valueChange,
            });
        }

        if (processedItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm hợp lệ' });
        }

        const stockCheck = await StockCheck.create({
            code: code.trim(),
            createdBy: userId,
            note: note?.trim() || '',
            status: 'draft',
            items: processedItems,
        });

        const populated = await StockCheck.findById(stockCheck._id)
            .populate('createdBy', 'firstName lastName username')
            .populate('items.product')
            .lean();

        res.status(201).json({
            success: true,
            data: { stockCheck: populated },
            message: 'Tạo phiếu kiểm kho thành công',
        });
    } catch (error) {
        console.error('createStockCheck error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo phiếu kiểm kho', error: error.message });
    }
};

/**
 * Xác nhận phiếu kiểm kho: cập nhật tồn kho sản phẩm theo số lượng đếm thực tế.
 */
export const confirmStockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const stockCheck = await StockCheck.findById(id);
        if (!stockCheck) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kho' });
        }
        if (stockCheck.status === 'confirmed') {
            return res.status(400).json({ message: 'Phiếu kiểm kho đã được xác nhận' });
        }

        for (const it of stockCheck.items) {
            await Product.findByIdAndUpdate(it.product, { quantity: it.quantityCounted });
        }
        stockCheck.status = 'confirmed';
        await stockCheck.save();

        const populated = await StockCheck.findById(id)
            .populate('createdBy', 'firstName lastName username')
            .populate('items.product')
            .lean();

        res.status(200).json({
            success: true,
            data: { stockCheck: populated },
            message: 'Đã xác nhận phiếu kiểm kho và cập nhật tồn kho',
        });
    } catch (error) {
        console.error('confirmStockCheck error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xác nhận phiếu kiểm kho', error: error.message });
    }
};
