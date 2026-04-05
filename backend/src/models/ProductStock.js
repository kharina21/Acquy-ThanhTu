import mongoose from 'mongoose';

/**
 * Bảng tồn kho theo chi nhánh (source of truth cho số lượng tại từng cơ sở).
 * Mỗi bản ghi: (product, location, quantity). Tổng tồn của sản phẩm = sum(quantity) theo product.
 */
const productStockSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true,
        },
        quantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        /** Số lượng đang giữ cho đơn online chưa xác nhận xuất kho (không trừ khỏi quantity cho đến khi kho xác nhận). */
        reservedOnlineQty: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

productStockSchema.index({ product: 1, location: 1 }, { unique: true });
productStockSchema.index({ location: 1 });
productStockSchema.index({ product: 1 });

const ProductStock = mongoose.model('ProductStock', productStockSchema);

export default ProductStock;
