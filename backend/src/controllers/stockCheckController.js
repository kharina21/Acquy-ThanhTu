import StockCheck from '../models/StockCheck.js';
import Product from '../models/Product.js';
import ProductStock from '../models/ProductStock.js';
import Location from '../models/Location.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import { generateStockCheckCode, todayYmdLocal, normalizeYmd } from '../utils/stockCheckCode.js';
import { getManagerAllowedLocationIds, validateLocationForUser } from '../libs/managerLocationHelper.js';

/** Lấy tồn kho tại chi nhánh (match sản phẩm ở ProductStock). */
async function getStockAtLocation(productId, locationId) {
    if (!locationId) return 0;
    const row = await ProductStock.findOne({ product: productId, location: locationId }).lean();
    return row ? row.quantity : 0;
}

/**
 * Hoàn tác tác động của phiếu đã xác nhận: đặt tồn kho về quantityBefore từng dòng.
 * Trả về message lỗi hoặc null nếu được phép.
 */
async function validateRevertStockCheckInventory(stockCheck) {
    const locationId = stockCheck.location;
    if (!locationId) return null;
    for (const it of stockCheck.items) {
        const row = await ProductStock.findOne({ product: it.product, location: locationId }).lean();
        const reserved = Math.max(0, Number(row?.reservedOnlineQty) || 0);
        const target = Math.max(0, Number(it.quantityBefore) || 0);
        if (target < reserved) {
            return 'Không thể hoàn tác: tồn sổ trước kiểm nhỏ hơn số đang giữ chỗ online. Vui lòng xử lý đơn hoặc điều chỉnh trước.';
        }
    }
    return null;
}

async function applyRevertStockCheckInventory(stockCheck) {
    const locationId = stockCheck.location;
    if (!locationId) return;
    for (const it of stockCheck.items) {
        const target = Math.max(0, Number(it.quantityBefore) || 0);
        await ProductStock.findOneAndUpdate(
            { product: it.product, location: locationId },
            { quantity: target },
            { upsert: true, new: true }
        );
    }
}

/**
 * Tạo mã kiểm kho: KK-YYYYMMDD-XXX (XXX = số thứ tự trong ngày, 3 chữ số).
 */
export const getNextCode = async (req, res) => {
    try {
        const dateParam = req.query.date?.trim();
        const code = await generateStockCheckCode(dateParam || null);
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

        const allowedIds = await getManagerAllowedLocationIds(req.user._id);
        const query = {};
        if (allowedIds !== null) {
            if (!allowedIds.length) {
                return res.status(200).json({
                    success: true,
                    data: {
                        stockChecks: [],
                        pagination: { page, limit, total: 0, totalPages: 1 },
                    },
                });
            }
            const allowedSet = new Set(allowedIds.map((id) => String(id)));
            if (locationId) {
                if (!allowedSet.has(String(locationId))) {
                    return res.status(403).json({ message: 'Bạn không có quyền xem kiểm kho tại chi nhánh này' });
                }
                query.location = locationId;
            } else {
                query.location = { $in: allowedIds };
            }
        } else if (locationId) {
            query.location = locationId;
        }

        /** Lọc theo ngày phiếu (documentDate); bản ghi cũ không có documentDate — lọc theo createdAt. */
        if (fromDate || toDate) {
            const fromY = fromDate || '1970-01-01';
            const toY = toDate || '9999-12-31';
            const start = new Date(fromY);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toY);
            end.setHours(23, 59, 59, 999);
            query.$or = [
                { documentDate: { $gte: fromY, $lte: toY } },
                {
                    $and: [
                        {
                            $or: [
                                { documentDate: null },
                                { documentDate: '' },
                                { documentDate: { $exists: false } },
                            ],
                        },
                        { createdAt: { $gte: start, $lte: end } },
                    ],
                },
            ];
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
                .sort({ documentDate: -1, createdAt: -1 })
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
        const { valid: canAccess } = await validateLocationForUser(req.user._id, stockCheck.location);
        if (!canAccess) {
            return res.status(403).json({ message: 'Bạn không có quyền xem phiếu kiểm kho này' });
        }
        res.status(200).json({ success: true, data: { stockCheck } });
    } catch (error) {
        console.error('getStockCheckById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết kiểm kho', error: error.message });
    }
};

/**
 * Tạo phiếu kiểm kho.
 * Body: { code, locationId, note?, documentDate? (YYYY-MM-DD), items: [{ productId, quantityCounted }] }
 * quantityBefore lấy từ ProductStock tại chi nhánh locationId.
 */
export const createStockCheck = async (req, res) => {
    try {
        const userId = req.user._id;
        const { code, locationId, note, items } = req.body;
        const documentDateRaw = req.body.documentDate;
        const documentDate =
            normalizeYmd(typeof documentDateRaw === 'string' ? documentDateRaw : '') || todayYmdLocal();
        if (documentDate > todayYmdLocal()) {
            return res.status(400).json({ message: 'Ngày phiếu không được sau ngày hôm nay' });
        }

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

        const { valid: canUseLocation } = await validateLocationForUser(req.user._id, locationId);
        if (!canUseLocation) {
            return res.status(403).json({ message: 'Bạn không được phép tạo phiếu kiểm kho tại chi nhánh này' });
        }

        const existingCode = await StockCheck.findOne({ code: code.trim() });
        if (existingCode) {
            return res.status(400).json({ message: 'Mã phiếu kiểm kho đã tồn tại' });
        }

        const processedItems = [];
        for (const it of items) {
            const productId = it.productId;
            const product = await Product.findById(productId).lean();
            if (!product) continue;
            const quantityBefore = await getStockAtLocation(productId, locationId);
            const rawCounted = it.quantityCounted;
            const hasCounted =
                rawCounted !== undefined && rawCounted !== null && rawCounted !== '' && !Number.isNaN(Number(rawCounted));
            const quantityCounted = hasCounted ? Math.max(0, Number(rawCounted)) : quantityBefore;
            const quantityChange = quantityCounted - quantityBefore;
            const unitPrice = product.costPrice ?? product.price ?? 0;
            const valueChange = quantityChange * unitPrice;
            const conditionNote =
                it.conditionNote != null ? String(it.conditionNote).trim().slice(0, 1000) : '';
            processedItems.push({
                product: productId,
                quantityBefore,
                quantityCounted,
                quantityChange,
                unitPrice,
                valueChange,
                conditionNote,
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
 * Cập nhật phiếu kiểm kho nháp: ghi chú + số lượng đếm thực tế từng dòng (tồn trên sổ quantityBefore giữ nguyên).
 */
export const updateStockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, items, documentDate: documentDateIn } = req.body || {};

        const stockCheck = await StockCheck.findById(id);
        if (!stockCheck) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kho' });
        }
        if (stockCheck.status !== 'draft') {
            return res.status(400).json({ message: 'Chỉ chỉnh sửa được phiếu ở trạng thái nháp' });
        }

        const { valid: canEdit } = await validateLocationForUser(req.user._id, stockCheck.location);
        if (!canEdit) {
            return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa phiếu kiểm kho này' });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Cần danh sách items (productId, quantityCounted)' });
        }

        const byProduct = new Map(stockCheck.items.map((row) => [String(row.product), row]));

        for (const it of items) {
            const pid = it.productId;
            if (!pid) continue;
            const row = byProduct.get(String(pid));
            if (!row) continue;
            const counted = Math.max(0, Number(it.quantityCounted) || 0);
            row.quantityCounted = counted;
            row.quantityChange = counted - (row.quantityBefore ?? 0);
            row.valueChange = row.quantityChange * (row.unitPrice ?? 0);
            if (it.conditionNote !== undefined) {
                row.conditionNote = it.conditionNote != null ? String(it.conditionNote).trim().slice(0, 1000) : '';
            }
        }

        if (note !== undefined) {
            stockCheck.note = String(note).trim();
        }

        if (documentDateIn !== undefined) {
            const d = normalizeYmd(String(documentDateIn));
            if (!d) {
                return res.status(400).json({ message: 'Ngày phiếu không hợp lệ (định dạng YYYY-MM-DD)' });
            }
            if (d > todayYmdLocal()) {
                return res.status(400).json({ message: 'Ngày phiếu không được sau ngày hôm nay' });
            }
            stockCheck.documentDate = d;
        }

        stockCheck.markModified('items');
        await stockCheck.save();

        const populated = await StockCheck.findById(id)
            .populate('createdBy', 'firstName lastName username')
            .populate('location', 'code name')
            .populate('items.product', 'sku name')
            .lean();

        res.status(200).json({
            success: true,
            data: { stockCheck: populated },
            message: 'Đã cập nhật phiếu kiểm kho',
        });
    } catch (error) {
        console.error('updateStockCheck error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật phiếu kiểm kho', error: error.message });
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

        const { valid: canConfirm } = await validateLocationForUser(req.user._id, stockCheck.location);
        if (!canConfirm) {
            return res.status(403).json({ message: 'Bạn không có quyền xác nhận phiếu kiểm kho này' });
        }

        const locationId = stockCheck.location;
        if (locationId) {
            for (const it of stockCheck.items) {
                const row = await ProductStock.findOne({ product: it.product, location: locationId }).lean();
                const reserved = Math.max(0, Number(row?.reservedOnlineQty) || 0);
                const counted = Math.max(0, Number(it.quantityCounted) || 0);
                if (counted < reserved) {
                    return res.status(400).json({
                        message:
                            'Tồn đếm thực tế không được nhỏ hơn số lượng đang giữ cho đơn online tại kho. ' +
                            'Vui lòng xử lý đơn hoặc điều chỉnh số đếm.',
                    });
                }
                await ProductStock.findOneAndUpdate(
                    { product: it.product, location: locationId },
                    { quantity: counted },
                    { upsert: true, new: true }
                );
            }
        }
        stockCheck.status = 'confirmed';
        stockCheck.confirmedAt = new Date();
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

/**
 * Hủy xác nhận: khôi phục tồn kho về số sổ trước kiểm (quantityBefore), phiếu về nháp.
 */
export const reopenStockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const stockCheck = await StockCheck.findById(id);
        if (!stockCheck) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kho' });
        }
        if (stockCheck.status !== 'confirmed') {
            return res.status(400).json({ message: 'Chỉ có thể hủy xác nhận khi phiếu đang ở trạng thái đã xác nhận' });
        }

        const { valid: canReopen } = await validateLocationForUser(req.user._id, stockCheck.location);
        if (!canReopen) {
            return res.status(403).json({ message: 'Bạn không có quyền thao tác phiếu kiểm kho này' });
        }

        const revertErr = await validateRevertStockCheckInventory(stockCheck);
        if (revertErr) {
            return res.status(400).json({ message: revertErr });
        }

        await applyRevertStockCheckInventory(stockCheck);
        stockCheck.status = 'draft';
        stockCheck.confirmedAt = null;
        await stockCheck.save();

        const populated = await StockCheck.findById(id)
            .populate('createdBy', 'firstName lastName username')
            .populate('location', 'code name')
            .populate('items.product', 'sku name')
            .lean();

        res.status(200).json({
            success: true,
            data: { stockCheck: populated },
            message: 'Đã hủy xác nhận — tồn kho khôi phục theo số sổ trước kiểm; phiếu ở trạng thái nháp.',
        });
    } catch (error) {
        console.error('reopenStockCheck error:', error.message);
        res.status(500).json({ message: 'Lỗi khi hủy xác nhận phiếu kiểm kho', error: error.message });
    }
};

/**
 * Xóa phiếu: nháp xóa thẳng; đã xác nhận thì hoàn tác tồn kho rồi xóa.
 */
export const deleteStockCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const stockCheck = await StockCheck.findById(id);
        if (!stockCheck) {
            return res.status(404).json({ message: 'Không tìm thấy phiếu kiểm kho' });
        }
        const { valid: canDelete } = await validateLocationForUser(req.user._id, stockCheck.location);
        if (!canDelete) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa phiếu kiểm kho này' });
        }

        if (stockCheck.status === 'confirmed') {
            const revertErr = await validateRevertStockCheckInventory(stockCheck);
            if (revertErr) {
                return res.status(400).json({ message: revertErr });
            }
            await applyRevertStockCheckInventory(stockCheck);
        }

        await StockCheck.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message:
                stockCheck.status === 'confirmed'
                    ? 'Đã hoàn tác tồn kho và xóa phiếu kiểm kho'
                    : 'Đã xóa phiếu kiểm kho',
        });
    } catch (error) {
        console.error('deleteStockCheck error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa phiếu kiểm kho', error: error.message });
    }
};
