import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ProductStock from '../models/ProductStock.js';
import StockCheck from '../models/StockCheck.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import UsageDevice from '../models/UsageDevice.js';
import { parseExcelBuffer } from '../utils/parseExcelProduct.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';
import { generateStockCheckCode } from '../utils/stockCheckCode.js';

async function findCategoryByName(categoryName) {
    const name = String(categoryName || '').trim();
    if (!name) return null;
    // Tìm category với case-insensitive và trim
    return await Category.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
}

async function findBrandByName(brandName) {
    const name = String(brandName || '').trim();
    if (!name) return null;
    // Tìm brand với case-insensitive và trim
    return await Brand.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
}

async function findUsageDeviceByName(usageName) {
    const name = String(usageName || '').trim();
    if (!name) return null;
    return await UsageDevice.findOne({
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
}

/** Đảm bảo product.images là mảng (tương thích dữ liệu cũ chỉ có image). */
function normalizeProductImages(product) {
    if (!product) return;
    if (Array.isArray(product.images) && product.images.length > 0) return;
    product.images = product.image ? [product.image] : [];
}

/**
 * Upload một hoặc nhiều ảnh sản phẩm lên Cloudinary (không lưu local).
 * Expect: multipart/form-data, field name "image" (có thể gửi nhiều file cùng tên).
 */
export const uploadProductImage = async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(503).json({
                message: 'Chưa cấu hình Cloudinary. Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào .env',
            });
        }
        const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);
        if (files.length === 0 || !files[0].buffer) {
            return res.status(400).json({ message: 'Vui lòng gửi ít nhất một file ảnh (field: image)' });
        }
        const urls = [];
        for (const file of files) {
            if (!file.buffer) continue;
            const result = await uploadImageFromBuffer(file.buffer, file.mimetype);
            urls.push(result.url);
        }
        if (urls.length === 0) {
            return res.status(400).json({ message: 'Không có file ảnh hợp lệ' });
        }
        res.status(200).json({ success: true, data: { url: urls[0], urls } });
    } catch (error) {
        console.error('uploadProductImage error:', error.message);
        res.status(500).json({
            message: error.message || 'Lỗi khi tải ảnh lên. Kiểm tra cấu hình Cloudinary.',
            error: error.message,
        });
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = (req.query.search || '').trim();
        const locationId = req.query.locationId?.trim();
        const brand = (req.query.brand || '').trim();
        const usageDevice = (req.query.usageDevice || '').trim();
        const priceMin = Number(req.query.priceMin) || 0;
        const priceMax = Number(req.query.priceMax) || 0;
        const skip = (page - 1) * limit;

        const query = { isDeleted: false };
        if (search) {
            const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = esc(search);
            query.$or = [
                { name: { $regex: re, $options: 'i' } },
                { sku: { $regex: re, $options: 'i' } },
                { barcode: { $regex: re, $options: 'i' } },
            ];
        }
        if (brand && mongoose.Types.ObjectId.isValid(brand)) {
            query.brand = brand;
        }
        if (usageDevice && mongoose.Types.ObjectId.isValid(usageDevice)) {
            query.usageDevice = usageDevice;
        }
        if (priceMin > 0 || priceMax > 0) {
            query.price = {};
            if (priceMin > 0) query.price.$gte = priceMin;
            if (priceMax > 0) query.price.$lte = priceMax;
        }

        // Lấy products không populate trước để kiểm tra
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Xử lý populate category/brand/usageDevice an toàn - chỉ populate nếu ref là ObjectId hợp lệ
        const processedProducts = await Promise.all(
            products.map(async (product) => {
                // Populate category, brand, usageDevice cùng lúc nếu là ObjectId hợp lệ
                const needsPopulate =
                    (product.category && mongoose.Types.ObjectId.isValid(product.category)) ||
                    (product.brand && mongoose.Types.ObjectId.isValid(product.brand)) ||
                    (product.usageDevice && mongoose.Types.ObjectId.isValid(product.usageDevice));

                if (needsPopulate) {
                    try {
                        const populated = await Product.findById(product._id)
                            .populate('category', 'name description')
                            .populate('brand', 'name description')
                            .populate('usageDevice', 'name description')
                            .lean();
                        if (populated?.category) {
                            product.category = populated.category;
                        } else if (product.category) {
                            product.category = null;
                        }
                        if (populated?.brand) {
                            product.brand = populated.brand;
                        } else if (product.brand) {
                            product.brand = null;
                        }
                        if (populated?.usageDevice) {
                            product.usageDevice = populated.usageDevice;
                        } else if (product.usageDevice) {
                            product.usageDevice = null;
                        }
                    } catch (error) {
                        product.category = null;
                        product.brand = null;
                    }
                } else {
                    // Không phải ObjectId hợp lệ, set null
                    if (product.category) product.category = null;
                    if (product.brand) product.brand = null;
                }

                normalizeProductImages(product);
                return product;
            })
        );

        const productIds = processedProducts.map((p) => p._id);
        const [totalsAgg, stocksAtLoc] = await Promise.all([
            ProductStock.aggregate([
                { $match: { product: { $in: productIds } } },
                { $group: { _id: '$product', total: { $sum: '$quantity' } } },
            ]).then((rows) => Object.fromEntries(rows.map((r) => [r._id.toString(), r.total]))),
            locationId
                ? ProductStock.find({ location: locationId, product: { $in: productIds } })
                    .select('product quantity')
                    .lean()
                    .then((rows) => Object.fromEntries(rows.map((s) => [s.product.toString(), s.quantity])))
                : Promise.resolve({}),
        ]);
        processedProducts.forEach((p) => {
            p.totalStock = totalsAgg[p._id.toString()] ?? 0;
            if (locationId) p.stockAtLocation = stocksAtLoc[p._id.toString()] ?? 0;
        });

        const total = await Product.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                products: processedProducts,
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
        // Lấy tất cả categories
        const categories = await Category.find({}).sort({ name: 1 });
        const categoryNames = categories.map(cat => cat.name);

        // Lấy tất cả brands
        const brands = await Brand.find({}).sort({ name: 1 });
        const brand = brands.map((b) => b.name);
        const filterAndSort = (arr) => [...new Set(arr)].filter(Boolean).map(String).sort((a, b) => a.localeCompare(b));

        res.status(200).json({
            success: true,
            data: {
                category: categoryNames,
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
        if (!product || product.isDeleted) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        // Xử lý populate category/brand/usageDevice an toàn
        if (product.category && mongoose.Types.ObjectId.isValid(product.category)) {
            try {
                const populated = await Product.findById(id)
                    .populate('category', 'name description')
                    .populate('brand', 'name description')
                    .populate('usageDevice', 'name description')
                    .lean();
                if (populated?.category?.name) {
                    product.category = populated.category;
                }
                if (populated?.brand?.name) {
                    product.brand = populated.brand;
                    product.brandName = populated.brand.name;
                }
                if (populated?.usageDevice?.name) {
                    product.usageDevice = populated.usageDevice;
                    product.usageDeviceName = populated.usageDevice.name;
                }
            } catch (error) {
                product.category = null;
            }
        } else if (typeof product.category === 'string' && product.category) {
            // Dữ liệu cũ - category là string
            product.category = null;
        }

        // BRAND legacy fallback
        if (product.brand && mongoose.Types.ObjectId.isValid(product.brand)) {
            try {
                const populated = await Product.findById(id).populate('brand', 'name description').lean();
                if (populated?.brand?.name) {
                    product.brand = populated.brand;
                    product.brandName = populated.brand.name;
                }
            } catch (error) {
                if (!product.brandName && typeof product.brand === 'string') product.brandName = product.brand;
                product.brand = null;
            }
        } else if (typeof product.brand === 'string' && product.brand) {
            if (!product.brandName) product.brandName = product.brand;
            product.brand = null;
        }

        normalizeProductImages(product);
        const totalRows = await ProductStock.aggregate([
            { $match: { product: product._id } },
            { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);
        product.totalStock = totalRows[0]?.total ?? 0;
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
        const existing = await Product.findOne({ $or: orConditions, isDeleted: false });
        if (existing) {
            if (existing.sku === sku) {
                return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
            }
            return res.status(400).json({ message: 'Mã vạch đã tồn tại' });
        }

        // Xử lý input name -> ref (category/brand)
        const productData = { ...req.body };
        if (productData.categoryName && !productData.category) {
            const category = await findCategoryByName(productData.categoryName);
            if (category) productData.category = category._id;
        }
        delete productData.categoryName; // không lưu categoryName nữa

        if (productData.brandName && !productData.brand) {
            const brand = await findBrandByName(productData.brandName);
            if (brand) productData.brand = brand._id;
        } else if (productData.brand && typeof productData.brand === 'string') {
            productData.brandName = productData.brand;
            const brand = await findBrandByName(productData.brand);
            if (brand) productData.brand = brand._id;
        }
        // Nếu có categoryId, giữ nguyên
        // Nếu không có cả hai, để null

        // Chuẩn hóa images: mảng URL (hỗ trợ nhiều ảnh)
        let images = Array.isArray(productData.images)
            ? productData.images.map((u) => String(u || '').trim()).filter(Boolean)
            : (productData.image ? [String(productData.image).trim()] : []);
        productData.images = images;
        productData.image = images[0] || '';
        delete productData.quantity;
        delete productData.totalStock;

        const product = await Product.create(productData);
        const locationId = req.body.locationId?.trim();
        const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) || 0 : null;
        if (locationId && quantity !== null) {
            await ProductStock.findOneAndUpdate(
                { product: product._id, location: locationId },
                { quantity },
                { upsert: true, new: true }
            );
        }
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name description')
            .populate('brand', 'name description')
            .populate('usageDevice', 'name description')
            .lean();
        res.status(201).json({ success: true, data: { product: populatedProduct }, message: 'Tạo sản phẩm thành công' });
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
        if (!oldProduct || oldProduct.isDeleted) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        const sku = req.body.sku?.trim();
        const barcode = req.body.barcode?.trim();
        let existing = await Product.findOne({ sku, _id: { $ne: id }, isDeleted: false });
        if (existing) {
            return res.status(400).json({ message: 'Mã hàng (SKU) đã tồn tại' });
        }
        if (barcode) {
            existing = await Product.findOne({ barcode, _id: { $ne: id }, isDeleted: false });
            if (existing) {
                return res.status(400).json({ message: 'Mã vạch đã tồn tại' });
            }
        }

        // Xử lý input name -> ref (category/brand)
        const updateData = { ...req.body };
        if (updateData.categoryName && !updateData.category) {
            const category = await findOrCreateCategoryByName(updateData.categoryName);
            if (category) updateData.category = category._id;
        }
        delete updateData.categoryName; // không lưu categoryName nữa

        if (updateData.brandName && !updateData.brand) {
            const brand = await findBrandByName(updateData.brandName);
            if (brand) updateData.brand = brand._id;
        }
        delete updateData.brandName; // không lưu brandName nữa
        // Nếu có brand ID, giữ nguyên

        // Chuẩn hóa images
        if (Array.isArray(updateData.images)) {
            updateData.images = updateData.images.map((u) => String(u || '').trim()).filter(Boolean);
            updateData.image = updateData.images[0] || '';
        } else if (updateData.image !== undefined) {
            const s = String(updateData.image || '').trim();
            updateData.images = s ? [s] : [];
            updateData.image = s;
        }
        const locationId = updateData.locationId?.trim();
        const quantity = updateData.quantity !== undefined ? Number(updateData.quantity) : null;
        delete updateData.quantity;
        delete updateData.totalStock;
        delete updateData.locationId;

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (product && locationId && quantity !== null) {
            const existingStock = await ProductStock.findOne({ product: product._id, location: locationId }).lean();
            const quantityBefore = existingStock?.quantity ?? 0;
            await ProductStock.findOneAndUpdate(
                { product: product._id, location: locationId },
                { quantity },
                { upsert: true, new: true }
            );
            if (req.user?._id) {
                const quantityChange = quantity - quantityBefore;
                const unitPrice = product.costPrice ?? product.price ?? 0;
                const valueChange = quantityChange * unitPrice;
                const code = await generateStockCheckCode();
                await StockCheck.create({
                    code,
                    location: locationId,
                    createdBy: req.user._id,
                    note: 'Điều chỉnh từ chỉnh sửa số lượng sản phẩm',
                    status: 'draft',
                    items: [{
                        product: product._id,
                        quantityBefore,
                        quantityCounted: quantity,
                        quantityChange,
                        unitPrice,
                        valueChange,
                    }],
                });
            }
        }
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name description')
            .populate('brand', 'name description')
            .lean();

        res.status(200).json({ success: true, data: { product: populatedProduct }, message: 'Cập nhật sản phẩm thành công' });
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
        const product = await Product.findById(id);
        if (!product || product.isDeleted) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        product.isDeleted = true;
        product.isActive = false;
        await product.save();
        res.status(200).json({ success: true, message: 'Đã ngừng kinh doanh sản phẩm (xóa mềm)' });
    } catch (error) {
        console.error('deleteProduct error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error: error.message });
    }
};

/**
 * Import sản phẩm từ file Excel.
 * Expect: multipart/form-data, field "file", optional "locationId". Cột "Tồn kho" = ProductStock tại locationId.
 */
export const importFromExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'Vui lòng gửi file Excel (field: file)' });
        }
        const locationId = (req.body?.locationId || req.query?.locationId || '').toString().trim() || null;
        const { products, errors, headerError } = parseExcelBuffer(req.file.buffer);
        if (headerError) {
            return res.status(400).json({
                success: false,
                message: errors[0]?.message || 'File Excel không đúng định dạng. Vui lòng dùng file mẫu mới nhất.',
                data: { imported: 0, errors },
            });
        }
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
            const existingBySku = await Product.findOne({ sku: p.sku, isDeleted: false });
            if (existingBySku) {
                duplicateSkus.push(p.sku);
                continue;
            }
            if (p.barcode && p.barcode.trim()) {
                const existingByBarcode = await Product.findOne({ barcode: p.barcode.trim(), isDeleted: false });
                if (existingByBarcode) {
                    duplicateBarcodes.push(p.barcode.trim());
                    continue;
                }
            }

            // Xử lý category: match tên với category trong DB, nếu không có thì tự động tạo
            const productData = { ...p };
            if (productData.categoryName && productData.categoryName.trim()) {
                const categoryNameTrimmed = String(productData.categoryName).trim();
                let category = await findCategoryByName(categoryNameTrimmed);
                if (!category) {
                    // Tự động tạo category nếu chưa có
                    category = await Category.create({
                        name: categoryNameTrimmed,
                        description: '',
                    });
                    console.log(`[Import Excel] Đã tự động tạo category: "${categoryNameTrimmed}"`);
                }
                if (category) {
                    productData.category = category._id;
                }
            }
            delete productData.categoryName; // không lưu categoryName nữa

            // Xử lý brand: match tên với brand trong DB, nếu không có thì tự động tạo
            if (productData.brandName && String(productData.brandName).trim()) {
                const brandNameTrimmed = String(productData.brandName).trim();
                let brand = await findBrandByName(brandNameTrimmed);
                if (!brand) {
                    // Tự động tạo brand nếu chưa có
                    brand = await Brand.create({
                        name: brandNameTrimmed,
                        description: '',
                    });
                    console.log(`[Import Excel] Đã tự động tạo brand: "${brandNameTrimmed}"`);
                }
                if (brand) {
                    productData.brand = brand._id;
                }
            }
            delete productData.brandName; // không lưu brandName nữa

            // Xử lý usageDevice: match tên với UsageDevice trong DB, nếu không có thì tự động tạo
            if (productData.usageDeviceName && String(productData.usageDeviceName).trim()) {
                const usageNameTrimmed = String(productData.usageDeviceName).trim();
                let usageDevice = await findUsageDeviceByName(usageNameTrimmed);
                if (!usageDevice) {
                    usageDevice = await UsageDevice.create({
                        name: usageNameTrimmed,
                        description: '',
                    });
                    console.log(`[Import Excel] Đã tự động tạo thiết bị sử dụng: "${usageNameTrimmed}"`);
                }
                if (usageDevice) {
                    productData.usageDevice = usageDevice._id;
                }
            }
            delete productData.usageDeviceName; // không lưu usageDeviceName nữa
            const quantityFromExcel = productData.quantity !== undefined ? Number(productData.quantity) ?? 0 : 0;
            delete productData.quantity;
            delete productData.totalStock;

            const doc = await Product.create(productData);
            if (locationId && quantityFromExcel >= 0) {
                await ProductStock.findOneAndUpdate(
                    { product: doc._id, location: locationId },
                    { quantity: quantityFromExcel },
                    { upsert: true, new: true }
                );
            }
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
        const query = { isDeleted: false };
        // Backward compatibility:
        // - category: accept Category ObjectId (string)
        // - brand: accept brandName (string)
        if (category && mongoose.Types.ObjectId.isValid(category)) query.category = category;
        if (brand && String(brand).trim()) query.brandName = String(brand).trim();

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

export const getCarBatteryProducts = async (req, res) => {
    try {
        const limit = 5;

        // Tìm usageDevice phù hợp
        const usageDevices = await UsageDevice.find({
            name: {
                $in: [
                    'Ô tô con, Xe du lịch',
                    'Xe tải, Tàu thuyền'
                ]
            }
        }).select('_id');

        const usageDeviceIds = usageDevices.map(u => u._id);

        // Lấy sản phẩm theo usageDevice
        const products = await Product.find({
            isDeleted: false,
            usageDevice: { $in: usageDeviceIds }
        })
            .sort({ createdAt: -1 }) // hoặc sort theo bán chạy nếu có field sold
            .limit(limit)
            .populate('category', 'name')
            .populate('brand', 'name')
            .populate('usageDevice', 'name')
            .lean();

        const processedProducts = products.map(product => {
            normalizeProductImages(product);
            return product;
        });

        res.status(200).json({
            success: true,
            data: { products: processedProducts }
        });

    } catch (error) {
        console.error('getCarBatteryProducts error:', error.message);
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách ắc quy ô tô',
            error: error.message
        });
    }
};

export const getMotorcycleBatteryProducts = async (req, res) => {
    try {
        const limit = 5;

        // Tìm usageDevice phù hợp
        const usageDevices = await UsageDevice.find({
            name: {
                $in: [
                    'Xe máy'
                ]
            }
        }).select('_id');

        const usageDeviceIds = usageDevices.map(u => u._id);

        // Lấy sản phẩm theo usageDevice
        const products = await Product.find({
            isDeleted: false,
            usageDevice: { $in: usageDeviceIds }
        })
            .sort({ createdAt: -1 }) // hoặc sort theo bán chạy nếu có field sold
            .limit(limit)
            .populate('category', 'name')
            .populate('brand', 'name')
            .populate('usageDevice', 'name')
            .lean();

        const processedProducts = products.map(product => {
            normalizeProductImages(product);
            return product;
        });

        res.status(200).json({
            success: true,
            data: { products: processedProducts }
        });

    } catch (error) {
        console.error('getMotorcycleBatteryProducts error:', error.message);
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách ắc quy xe máy',
            error: error.message
        });
    }
};

const buildFilter = (queryParams) => {
    const {
        category,
        brand,
        usageDevice,
        minAh,
        maxAh,
        minPrice,
        maxPrice,
        search
    } = queryParams;

    const query = {
        isDeleted: false
    };



    if (category) {
        const ids = category
            .split(',')
            .filter(id => mongoose.Types.ObjectId.isValid(id));

        if (ids.length) {
            query.category = {
                $in: ids.map(id => new mongoose.Types.ObjectId(id))
            };
        }
    }

    if (brand) {
        const ids = brand
            .split(',')
            .filter(id => mongoose.Types.ObjectId.isValid(id));

        if (ids.length) {
            query.brand = {
                $in: ids.map(id => new mongoose.Types.ObjectId(id))
            };
        }
    }

    if (usageDevice) {
        const ids = usageDevice
            .split(',')
            .filter(id => mongoose.Types.ObjectId.isValid(id));

        if (ids.length) {
            query.usageDevice = {
                $in: ids.map(id => new mongoose.Types.ObjectId(id))
            };
        }
    }

    if (minAh || maxAh) {

        const capacityNumber = {
            $convert: {
                input: {
                    $replaceAll: {
                        input: "$capacity",
                        find: "Ah",
                        replacement: ""
                    }
                },
                to: "double",
                onError: null,
                onNull: null
            }
        };

        const exprConditions = [];

        if (minAh) {
            exprConditions.push({
                $gte: [capacityNumber, Number(minAh)]
            });
        }

        if (maxAh) {
            exprConditions.push({
                $lte: [capacityNumber, Number(maxAh)]
            });
        }

        query.$or = [
            {
                $expr: { $and: exprConditions }
            },
            {
                capacity: { $exists: false }
            },
            {
                capacity: ""
            }
        ];
    }

    if (minPrice || maxPrice) {
        query.price = {};

        if (minPrice && minPrice !== "0") {
            query.price.$gte = parseFloat(minPrice);
        }

        if (maxPrice && maxPrice !== "0") {
            query.price.$lte = parseFloat(maxPrice);
        }

        if (Object.keys(query.price).length === 0) {
            delete query.price;
        }
    }

    function escapeRegex(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    if (search) {
        const safeSearch = escapeRegex(search);
        query.name = {
            $regex: safeSearch,
            $options: 'i'
        };
    }

    return query;

};

const buildSort = (sort) => {

    switch (sort) {

        case "price_asc":
            return { price: 1 };

        case "price_desc":
            return { price: -1 };

        case "ah_asc":
            return { capacityNumber: 1 };

        case "ah_desc":
            return { capacityNumber: -1 };

        default:
            return { createdAt: -1 };

    }

};

export const getFilterOptions = async (req, res) => {
    try {
        const categories = await Category.find({}).select('name');
        const brands = await Brand.find({}).select('name');
        const usageDevices = await UsageDevice.find({}).select('name');

        res.json({
            success: true,
            data: {
                categories,
                brands,
                usageDevices
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi lấy tùy chọn lọc',
            error: error.message
        });
    }
}

export const filterProducts = async (req, res) => {
    try {

        console.log("REQ QUERY:", req.query);

        const { page = 1, limit = 15, sort } = req.query;

        const filterQuery = buildFilter(req.query);
        const sortQuery = buildSort(sort);

        const skip = (page - 1) * limit;

        const products = await Product.aggregate([

            { $match: filterQuery },

            {
                $addFields: {
                    capacityNumber: {
                        $convert: {
                            input: {
                                $replaceAll: {
                                    input: "$capacity",
                                    find: "Ah",
                                    replacement: ""
                                }
                            },
                            to: "double",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },

            { $sort: sortQuery },

            { $skip: skip },

            { $limit: Number(limit) }

        ]);

        await Product.populate(products, [
            { path: "category", select: "name" },
            { path: "brand", select: "name" },
            { path: "usageDevice", select: "name" }
        ]);

        const totalProducts = await Product.countDocuments(filterQuery);

        const processedProducts = products.map(product => {
            normalizeProductImages(product);
            return product;
        });

        res.status(200).json({
            success: true,
            data: {
                products: processedProducts,
                totalProducts,
                totalPages: Math.ceil(totalProducts / limit),
                currentPage: Number(page)
            }
        });
    } catch (error) {
        console.error('filterProducts error:', error.message);
        res.status(500).json({
            message: "Lỗi khi lọc danh sách sản phẩm",
            error: error.message
        });
    }


};


/**
 * Lấy danh sách sản phẩm liên quan
 */
export const getRelatedProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 4;

        // 1. Lấy thông tin sản phẩm gốc
        const targetProduct = await Product.findById(id).lean();
        if (!targetProduct || targetProduct.isDeleted) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        const targetId = targetProduct._id.toString();
        const targetUsageDevice = targetProduct.usageDevice?.toString();
        const targetCategory = targetProduct.category?.toString();

        // 2. Thu thập ứng viên theo nhiều mức độ ưu tiên
        let candidates = [];

        // Mức 1: Cùng cả thiết bị sử dụng VÀ cùng danh mục
        if (targetUsageDevice && targetCategory) {
            const lv1 = await Product.find({
                _id: { $ne: targetId },
                isDeleted: false,
                usageDevice: targetUsageDevice,
                category: targetCategory,
            })
                .limit(limit * 2)
                .populate("category brand usageDevice")
                .lean();
            candidates = [...lv1];
        }

        // Mức 2: Nếu chưa đủ limit, tìm cùng thiết bị sử dụng (khác danh mục cũng được)
        if (candidates.length < limit && targetUsageDevice) {
            const existingIds = candidates.map((c) => c._id.toString());
            const lv2 = await Product.find({
                _id: { $ne: targetId, $nin: existingIds },
                isDeleted: false,
                usageDevice: targetUsageDevice,
            })
                .limit(limit)
                .populate("category brand usageDevice")
                .lean();
            candidates = [...candidates, ...lv2];
        }

        // Mức 3: Nếu vẫn chưa đủ limit, tìm cùng danh mục
        if (candidates.length < limit && targetCategory) {
            const existingIds = [targetId, ...candidates.map((c) => c._id.toString())];
            const lv3 = await Product.find({
                _id: { $nin: existingIds },
                isDeleted: false,
                category: targetCategory,
            })
                .limit(limit)
                .populate("category brand usageDevice")
                .lean();
            candidates = [...candidates, ...lv3];
        }

        // 3. Xử lý logic dung lượng (Capacity) để sắp xếp trong cùng một mức ưu tiên nếu cần
        const parseCapacity = (capStr) => {
            if (!capStr) return 0;
            const match = String(capStr).match(/\d+(\.\d+)?/);
            return match ? parseFloat(match[0]) : 0;
        };
        const targetCap = parseCapacity(targetProduct.capacity);

        // Hàm tính điểm ưu tiên (Score)
        // Cùng device: +1000 điểm
        // Cùng category: +500 điểm
        // Độ lệch dung lượng: trừ điểm
        const getScore = (p) => {
            let score = 0;
            const pDevice = p.usageDevice?._id?.toString() || p.usageDevice?.toString();
            const pCategory = p.category?._id?.toString() || p.category?.toString();
            
            if (targetUsageDevice && pDevice === targetUsageDevice) score += 1000;
            if (targetCategory && pCategory === targetCategory) score += 500;
            
            const capDiff = Math.abs(parseCapacity(p.capacity) - targetCap);
            score -= capDiff; // Dung lượng càng gần càng tốt
            
            return score;
        };

        // Sắp xếp lại dựa trên score
        candidates.sort((a, b) => getScore(b) - getScore(a));

        // 4. Lấy top X
        const topProducts = candidates.slice(0, limit);

        // Normalize dữ liệu trước khi trả về
        topProducts.forEach((p) => {
            normalizeProductImages(p);
            if (p.category) p.categoryName = p.category.name;
            if (p.brand) p.brandName = p.brand.name;
            if (p.usageDevice) p.usageDeviceName = p.usageDevice.name;
        });

        res.status(200).json({
            success: true,
            data: { products: topProducts },
        });
    } catch (error) {
        console.error("getRelatedProducts error:", error.message);
        res.status(500).json({ message: "Lỗi khi lấy sản phẩm liên quan", error: error.message });
    }
};