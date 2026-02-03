import StockCheck from '../models/StockCheck.js';
import Product from '../models/Product.js';
import ProductStock from '../models/ProductStock.js';
import Location from '../models/Location.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { generateStockCheckCode } from '../utils/stockCheckCode.js';

/** Lấy tồn kho tại chi nhánh (match sản phẩm ở ProductStock). */
async function getStockAtLocation(productId, locationId) {
    if (!locationId) return 0;
    const row = await ProductStock.findOne({ product: productId, location: locationId }).lean();
    return row ? row.quantity : 0;
}

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
 * Query: page, limit, locationId, fromDate, toDate, brand, category
 */
export const getAllStockChecks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const locationId = req.query.locationId?.trim();
        const fromDate = req.query.fromDate?.trim();
        const toDate = req.query.toDate?.trim();
        const brand = req.query.brand?.trim();
        const category = req.query.category?.trim();
        const skip = (page - 1) * limit;

        const query = {};
        if (locationId) query.location = locationId;

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

            // Map category name -> Category ObjectId
            if (category) {
                const catDoc = await Category.findOne({ name: category }).select('_id').lean();
                if (!catDoc) {
                    // Không có category nào trùng tên -> chắc chắn không có sản phẩm
                    query['items.product'] = { $in: [] };
                } else {
                    productQuery.category = catDoc._id;
                }
            }

            // Map brand name -> Brand ObjectId
            if (brand) {
                const brandDoc = await Brand.findOne({ name: brand }).select('_id').lean();
                if (!brandDoc) {
                    query['items.product'] = { $in: [] };
                } else {
                    productQuery.brand = brandDoc._id;
                }
            }

            if (Object.keys(productQuery).length > 0 && !query['items.product']) {
                const productIds = await Product.find(productQuery).distinct('_id');
                query['items.product'] = { $in: productIds.length > 0 ? productIds : [] };
            }
        }

        const [list, total] = await Promise.all([
            StockCheck.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'firstName lastName username')
                .populate('location', 'code name')
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
            .populate('location', 'code name')
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
 * Body: { code, locationId, note?, items: [{ productId, quantityCounted }] }
 * quantityBefore lấy từ ProductStock tại chi nhánh locationId.
 */
export const createStockCheck = async (req, res) => {
    try {
        const userId = req.user._id;
        const { code, locationId, note, items } = req.body;

        if (!code || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mã phiếu và ít nhất một sản phẩm' });
        }
        if (!locationId) {
            return res.status(400).json({ message: 'Vui lòng chọn chi nhánh kiểm kho' });
        }
        const location = await Location.findById(locationId);
        if (!location) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
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
            const quantityBefore = await getStockAtLocation(productId, locationId);
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
            location: locationId,
            createdBy: userId,
            note: note?.trim() || '',
            status: 'draft',
            items: processedItems,
        });

        const populated = await StockCheck.findById(stockCheck._id)
            .populate('createdBy', 'firstName lastName username')
            .populate('location', 'code name')
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
 * Xác nhận phiếu kiểm kho: cập nhật ProductStock tại chi nhánh theo số đếm thực tế.
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

        const locationId = stockCheck.location;
        if (locationId) {
            for (const it of stockCheck.items) {
                await ProductStock.findOneAndUpdate(
                    { product: it.product, location: locationId },
                    { quantity: it.quantityCounted ?? 0 },
                    { upsert: true, new: true }
                );
            }
        }
        stockCheck.status = 'confirmed';
        await stockCheck.save();

        const populated = await StockCheck.findById(id)
            .populate('createdBy', 'firstName lastName username')
            .populate('location', 'code name')
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
