import Product from '../models/Product.js';
import StockCheck from '../models/StockCheck.js';
import { parseExcelBuffer } from '../utils/parseExcelProduct.js';
import { generateStockCheckCode } from '../utils/stockCheckCode.js';

export const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = (req.query.search || '').trim();
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
            ];
        }

        const [products, total] = await Promise.all([
            Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Product.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (error) {
        console.error('getAllProducts error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách sản phẩm', error: error.message });
    }
};

/**
 * Lấy danh sách Loại hàng và Thương hiệu distinct (cho select).
 */
export const getProductOptions = async (req, res) => {
    try {
        const [category, brand] = await Promise.all([
            Product.distinct('category'),
            Product.distinct('brand'),
        ]);
        const filterAndSort = (arr) => [...new Set(arr)].filter(Boolean).map(String).sort((a, b) => a.localeCompare(b));
        res.status(200).json({
            success: true,
            data: {
                category: filterAndSort(category),
                brand: filterAndSort(brand),
            },
        });
    } catch (error) {
        console.error('getProductOptions error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách loại hàng/thương hiệu', error: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).lean();
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ success: true, data: { product } });
    } catch (error) {
        console.error('getProductById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin sản phẩm', error: error.message });
    }
};

export const createProduct = async (req, res) => {
    try {
        const sku = req.body.sku?.trim();
        const barcode = req.body.barcode?.trim();
        const orConditions = [{ sku }];
        if (barcode) orConditions.push({ barcode });
        const existing = await Product.findOne({ $or: orConditions });
        if (existing) {
            if (existing.sku === sku) {
                return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
            }
            return res.status(400).json({ message: 'Mã vạch đã tồn tại' });
        }
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: { product }, message: 'Tạo sản phẩm thành công' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
        }
        console.error('createProduct error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const oldProduct = await Product.findById(id).lean();
        if (!oldProduct) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        const sku = req.body.sku?.trim();
        const barcode = req.body.barcode?.trim();
        let existing = await Product.findOne({ sku, _id: { $ne: id } });
        if (existing) {
            return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
        }
        if (barcode) {
            existing = await Product.findOne({ barcode, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Mã vạch đã tồn tại' });
            }
        }
        const product = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        // Khi thay đổi số lượng: tự tạo phiếu kiểm kho (1 dòng) để ghi nhận thay đổi
        const newQty = req.body.quantity !== undefined ? Number(req.body.quantity) : undefined;
        const oldQty = oldProduct.quantity ?? 0;
        if (newQty !== undefined && newQty !== oldQty && req.user?._id) {
            const code = await generateStockCheckCode();
            const quantityChange = newQty - oldQty;
            const unitPrice = oldProduct.costPrice ?? oldProduct.price ?? 0;
            const valueChange = quantityChange * unitPrice;
            await StockCheck.create({
                code,
                createdBy: req.user._id,
                note: 'Tự động tạo khi chỉnh sửa số lượng sản phẩm',
                status: 'confirmed',
                items: [
                    {
                        product: id,
                        quantityBefore: oldQty,
                        quantityCounted: newQty,
                        quantityChange,
                        unitPrice,
                        valueChange,
                    },
                ],
            });
        }

        res.status(200).json({ success: true, data: { product }, message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
        }
        console.error('updateProduct error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm', error: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('deleteProduct error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error: error.message });
    }
};

/**
 * Import sản phẩm từ file Excel.
 * Expect: multipart/form-data, field name "file"
 */
export const importFromExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'Vui lòng gửi file Excel (field: file)' });
        }
        const { products, errors } = parseExcelBuffer(req.file.buffer);
        if (products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'File không có dữ liệu hợp lệ. Dòng đầu phải là header đúng format.',
                data: { imported: 0, errors },
            });
        }
        const inserted = [];
        const duplicateSkus = [];
        const duplicateBarcodes = [];
        for (const p of products) {
            const existingBySku = await Product.findOne({ sku: p.sku });
            if (existingBySku) {
                duplicateSkus.push(p.sku);
                continue;
            }
            if (p.barcode && p.barcode.trim()) {
                const existingByBarcode = await Product.findOne({ barcode: p.barcode.trim() });
                if (existingByBarcode) {
                    duplicateBarcodes.push(p.barcode.trim());
                    continue;
                }
            }
            const doc = await Product.create(p);
            inserted.push(doc);
        }
        const skipMsg = [duplicateSkus.length && `${duplicateSkus.length} mã hàng trùng`, duplicateBarcodes.length && `${duplicateBarcodes.length} mã vạch trùng`].filter(Boolean).join(', ');
        res.status(200).json({
            success: true,
            message: `Đã import ${inserted.length} sản phẩm${skipMsg ? `; ${skipMsg} đã bỏ qua` : ''}.`,
            data: {
                imported: inserted.length,
                skipped: duplicateSkus.length + duplicateBarcodes.length,
                duplicateSkus: duplicateSkus.slice(0, 20),
                duplicateBarcodes: duplicateBarcodes.slice(0, 20),
                errors,
            },
        });
    } catch (error) {
        console.error('importFromExcel error:', error.message);
        res.status(500).json({
            message: error.message || 'Import thất bại. Kiểm tra định dạng file Excel.',
            error: error.message,
        });
    }
};

/**
 * Cập nhật giá hàng loạt.
 * Body: { category?, brand?, type: 'margin' | 'percent' | 'fixed', value: number }
 * - margin: giá bán mới = giá vốn * (1 + value/100)
 * - percent: giá bán mới = giá bán hiện tại * (1 + value/100)
 * - fixed: giá bán mới = value (VNĐ)
 */
export const bulkUpdatePrice = async (req, res) => {
    try {
        const { category, brand, type, value } = req.body;
        const query = {};
        if (category && String(category).trim()) query.category = String(category).trim();
        if (brand && String(brand).trim()) query.brand = String(brand).trim();

        const numValue = Number(value);
        if (type !== 'margin' && type !== 'percent' && type !== 'fixed') {
            return res.status(400).json({ message: 'Loại cập nhật phải là: margin, percent hoặc fixed' });
        }
        if (Number.isNaN(numValue) || (type === 'fixed' && numValue < 0)) {
            return res.status(400).json({ message: 'Giá trị không hợp lệ' });
        }

        const products = await Product.find(query).lean();
        let updated = 0;
        for (const p of products) {
            let newPrice = p.price ?? 0;
            if (type === 'margin') {
                const cost = p.costPrice ?? 0;
                newPrice = Math.round(cost * (1 + numValue / 100));
            } else if (type === 'percent') {
                newPrice = Math.round((p.price ?? 0) * (1 + numValue / 100));
            } else {
                newPrice = Math.round(numValue);
            }
            if (newPrice < 0) newPrice = 0;
            await Product.updateOne({ _id: p._id }, { price: newPrice });
            updated++;
        }
        res.status(200).json({
            success: true,
            message: `Đã cập nhật giá ${updated} sản phẩm`,
            data: { updated },
        });
    } catch (error) {
        console.error('bulkUpdatePrice error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật giá hàng loạt', error: error.message });
    }
};

/**
 * Cập nhật bảo hành hàng loạt.
 * Body: { category?, brand?, warrantyMonths?, warrantyText? }
 */
export const bulkUpdateWarranty = async (req, res) => {
    try {
        const { category, brand, warrantyMonths, warrantyText } = req.body;
        const query = {};
        if (category && String(category).trim()) query.category = String(category).trim();
        if (brand && String(brand).trim()) query.brand = String(brand).trim();

        const update = {};
        if (warrantyMonths !== undefined && warrantyMonths !== null && warrantyMonths !== '') {
            const months = Number(warrantyMonths);
            update.warrantyMonths = Number.isNaN(months) ? null : months;
        }
        if (warrantyText !== undefined) update.warrantyText = String(warrantyText ?? '').trim();

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: 'Vui lòng nhập ít nhất bảo hành (tháng) hoặc ghi chú bảo hành' });
        }

        const result = await Product.updateMany(query, { $set: update });
        res.status(200).json({
            success: true,
            message: `Đã cập nhật bảo hành ${result.modifiedCount} sản phẩm`,
            data: { updated: result.modifiedCount },
        });
    } catch (error) {
        console.error('bulkUpdateWarranty error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật bảo hành hàng loạt', error: error.message });
    }
};

/**
 * Đếm sản phẩm theo bộ lọc (category, brand) - dùng cho preview trước khi bulk update.
 */
export const countProductsByFilter = async (req, res) => {
    try {
        const { category, brand } = req.query;
        const query = {};
        if (category && String(category).trim()) query.category = String(category).trim();
        if (brand && String(brand).trim()) query.brand = String(brand).trim();
        const count = await Product.countDocuments(query);
        res.status(200).json({ success: true, data: { count } });
    } catch (error) {
        console.error('countProductsByFilter error:', error.message);
        res.status(500).json({ message: 'Lỗi khi đếm sản phẩm', error: error.message });
    }
};
