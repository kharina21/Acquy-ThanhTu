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
    return res.status(403).json({
        message: 'Không được chỉnh tồn kho trực tiếp. Dùng Nhập kho, Xuất kho hoặc Kiểm kho.',
    });
};

/**
 * PUT /api/product-stocks/bulk
 * Body: { locationId, items: [{ productId, quantity }] }
 * Cập nhật tồn nhiều sản phẩm tại một chi nhánh.
 */
export const bulkSetProductStock = async (req, res) => {
    return res.status(403).json({
        message: 'Không được chỉnh tồn kho trực tiếp. Dùng Nhập kho, Xuất kho hoặc Kiểm kho.',
    });
};

/**
 * Lấy tồn tại một chi nhánh cho một sản phẩm (helper, có thể dùng nội bộ).
 * Trả về 0 nếu chưa có bản ghi ProductStock.
 */
/** Tồn thực tế tại kho (không trừ giữ chỗ đơn online). */
export async function getPhysicalStockAtLocation(productId, locationId) {
    const row = await ProductStock.findOne({ product: productId, location: locationId }).lean();
    return row ? row.quantity : 0;
}

/**
 * Tồn khả dụng để bán online / hiển thị cho khách = quantity − reservedOnlineQty.
 */
export async function getStockAtLocation(productId, locationId) {
    const row = await ProductStock.findOne({ product: productId, location: locationId }).lean();
    if (!row) return 0;
    const reserved = Math.max(0, Number(row.reservedOnlineQty) || 0);
    return Math.max(0, (row.quantity || 0) - reserved);
}
