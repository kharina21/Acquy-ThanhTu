import ProductStock from '../models/ProductStock.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';

/**
 * GET /api/product-stocks?locationId=xxx  -> danh sách tồn tại một chi nhánh (product + quantity)
 * GET /api/product-stocks?productId=xxx   -> danh sách tồn của một sản phẩm tại các chi nhánh
 */
export const getProductStocks = async (req, res) => {
    try {
        const { locationId, productId } = req.query;

        if (locationId) {
            const location = await Location.findById(locationId);
            if (!location) {
                return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
            }
            const stocks = await ProductStock.find({ location: locationId })
                .populate('product', 'sku name price costPrice')
                .populate('location', 'code name')
                .lean();
            return res.status(200).json({
                success: true,
                data: { stocks, location: { _id: location._id, code: location.code, name: location.name } },
            });
        }

        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }
            const stocks = await ProductStock.find({ product: productId })
                .populate('location', 'code name')
                .lean();
            return res.status(200).json({
                success: true,
                data: { stocks, product: { _id: product._id, sku: product.sku, name: product.name } },
            });
        }

        return res.status(400).json({ message: 'Cần truyền locationId hoặc productId' });
    } catch (error) {
        console.error('getProductStocks error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy tồn kho', error: error.message });
    }
};

/**
 * PUT /api/product-stocks
 * Body: { productId, locationId, quantity }
 * Tạo hoặc cập nhật tồn kho tại chi nhánh. Bảng Product không lưu tồn; tồn chỉ ở ProductStock.
 */
export const setProductStock = async (req, res) => {
    try {
        const { productId, locationId, quantity } = req.body;
        const qty = Number(quantity);
        if (qty < 0 || isNaN(qty)) {
            return res.status(400).json({ message: 'Số lượng không hợp lệ' });
        }
        if (!productId || !locationId) {
            return res.status(400).json({ message: 'Thiếu productId hoặc locationId' });
        }

        const product = await Product.findById(productId);
        const location = await Location.findById(locationId);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        if (!location) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

        let stock = await ProductStock.findOne({ product: productId, location: locationId });
        if (!stock) {
            stock = await ProductStock.create({ product: productId, location: locationId, quantity: qty });
        } else {
            stock.quantity = qty;
            await stock.save();
        }

        const populated = await ProductStock.findById(stock._id)
            .populate('product', 'sku name')
            .populate('location', 'code name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Cập nhật tồn kho thành công',
            data: { stock: populated },
        });
    } catch (error) {
        console.error('setProductStock error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật tồn kho', error: error.message });
    }
};

/**
 * PUT /api/product-stocks/bulk
 * Body: { locationId, items: [{ productId, quantity }] }
 * Cập nhật tồn nhiều sản phẩm tại một chi nhánh.
 */
export const bulkSetProductStock = async (req, res) => {
    try {
        const { locationId, items } = req.body;
        if (!locationId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Cần locationId và mảng items (productId, quantity)' });
        }

        const location = await Location.findById(locationId);
        if (!location) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

        const productIds = [];
        for (const it of items) {
            const productId = it.productId;
            const qty = Number(it.quantity);
            if (!productId || qty < 0 || isNaN(qty)) continue;
            let stock = await ProductStock.findOne({ product: productId, location: locationId });
            if (!stock) {
                await ProductStock.create({ product: productId, location: locationId, quantity: qty });
            } else {
                await ProductStock.updateOne({ _id: stock._id }, { quantity: qty });
            }
            productIds.push(productId);
        }

        const stocks = await ProductStock.find({ location: locationId })
            .populate('product', 'sku name')
            .populate('location', 'code name')
            .lean();

        res.status(200).json({
            success: true,
            message: 'Cập nhật tồn kho thành công',
            data: { stocks },
        });
    } catch (error) {
        console.error('bulkSetProductStock error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật tồn kho', error: error.message });
    }
};

/**
 * Lấy tồn tại một chi nhánh cho một sản phẩm (helper, có thể dùng nội bộ).
 * Trả về 0 nếu chưa có bản ghi ProductStock.
 */
export async function getStockAtLocation(productId, locationId) {
    const row = await ProductStock.findOne({ product: productId, location: locationId }).lean();
    return row ? row.quantity : 0;
}
