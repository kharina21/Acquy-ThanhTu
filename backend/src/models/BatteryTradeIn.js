import mongoose from 'mongoose';

/**
 * Yêu cầu thu cũ acquy - Guest và Customer đều có thể gửi.
 */
const batteryTradeInSchema = new mongoose.Schema(
    {
        // Thông tin người dùng
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        address: { type: String, default: '' },
        /** Địa chỉ tách (để prefill form sửa đơn) */
        provinceCode: { type: String, default: '' },
        provinceName: { type: String, default: '' },
        districtCode: { type: String, default: '' },
        districtName: { type: String, default: '' },
        wardCode: { type: String, default: '' },
        wardName: { type: String, default: '' },
        addressLine: { type: String, default: '' },
        note: { type: String, default: '' },

        // Liên kết user (nếu đã đăng nhập)
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

        /** Mã tra cứu công khai (vd: TC-2025-A1B2C3D4), gửi kèm email */
        requestCode: { type: String, trim: true, default: null },

        // Thông tin acquy
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        batteryName: { type: String, default: '' },
        images: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        manufacturingDate: { type: Date },
        expiryDate: { type: Date },
        condition: { type: String, default: '' },
        usageDuration: { type: String, default: '' },
        isWorkingWell: { type: Boolean },
        pricingType: { type: String, enum: ['ampe', 'weight'], default: 'ampe' },
        remainingAmps: { type: String, default: '' },
        weightKg: { type: String, default: '' },

        status: {
            type: String,
            enum: ['pending', 'contacted', 'completed', 'cancelled'],
            default: 'pending',
        },

        /** Thời gian đã xác nhận với khách khi chuyển sang "Đã liên hệ" */
        appointmentAt: { type: Date, default: null },
        /** Cơ sở / chi nhánh đã hẹn với khách */
        appointmentLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },

        /** Cơ sở khách hàng muốn thu cũ (chọn khi gửi yêu cầu) */
        preferredLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },

        /** Nguồn đơn: 'online' (khách gửi web) | 'offline' (nhân viên tạo tại cửa hàng) */
        source: { type: String, enum: ['online', 'offline'], default: 'online' },

        /** Nhân viên được giao xử lý yêu cầu này */
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        assignedAt: { type: Date, default: null },

        /** Nhân viên đã hoàn thành thu mua */
        handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

        /** Chi nhánh khi hoàn thành thu mua (báo cáo chi phí thu cũ theo cơ sở) */
        locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },

        /** Khi hoàn thành: sản phẩm acquy thu được (danh mục) — tuỳ chọn nếu dùng tên tự ghi */
        completedProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        /** Tên sản phẩm acquy thu được (ghi tay khi hoàn tất) */
        completedProductName: { type: String, default: '', trim: true, maxlength: 200 },
        /** Số tiền thu mua (VNĐ) — khoản chi cửa hàng trả cho khách khi thu cũ */
        completedAmount: { type: Number, default: null, min: 0 },
        completedAt: { type: Date, default: null },
        completedNote: { type: String, default: '' },

        cancelledAt: { type: Date, default: null },
        cancelledReason: { type: String, default: '' },

        /** Thông tin bán acquy thu cũ cho nhà máy tái chế */
        saleInfo: {
            sold: { type: Boolean, default: false },
            soldAt: { type: Date, default: null },
            buyerName: { type: String, default: '' },
            buyerPhone: { type: String, default: '' },
            buyerAddress: { type: String, default: '' },
            saleQuantity: { type: Number, default: 0 },
            saleUnitPrice: { type: Number, default: 0 },
            saleTotalAmount: { type: Number, default: 0 },
            saleCode: { type: String, default: '' },
            soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
        }
    },
    { timestamps: true }
);

batteryTradeInSchema.index({ status: 1 });
batteryTradeInSchema.index({ requestCode: 1 }, { unique: true, sparse: true });
batteryTradeInSchema.index({ createdAt: -1 });
batteryTradeInSchema.index({ completedAt: -1 });
batteryTradeInSchema.index({ locationId: 1 });
batteryTradeInSchema.index({ preferredLocationId: 1 });
batteryTradeInSchema.index({ source: 1 });
batteryTradeInSchema.index({ assignedTo: 1 });
batteryTradeInSchema.index({ 'saleInfo.sold': 1 });
batteryTradeInSchema.index({ 'saleInfo.soldAt': -1 });
batteryTradeInSchema.index({ handledBy: 1 });

const BatteryTradeIn = mongoose.model('BatteryTradeIn', batteryTradeInSchema);

export default BatteryTradeIn;
