import mongoose from 'mongoose';

/**
 * Warranty – Bảo hành sản phẩm.
 *
 * Mỗi sản phẩm trong một Order (đã thanh toán) sẽ sinh ra 1 Warranty record.
 * Thời gian bảo hành tính từ ngày mua hàng (purchaseDate = order.createdAt).
 *
 * Cách sinh mã bảo hành:
 *   BH-YYYY-XXXXX  (VD: BH-2026-00001)
 *   - YYYY: năm hiện tại
 *   - XXXXX: số thứ tự tự động tăng trong năm
 */
const warrantySchema = new mongoose.Schema(
    {
        /** Mã bảo hành duy nhất, format: BH-YYYY-NNNNN */
        warrantyCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // ── Liên kết Order ──────────────────────────────────────────────
        /** ObjectId của Order (đơn hàng mua sản phẩm này) */
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        /** Mã Order – denormalize để tra cứu nhanh bằng mã hóa đơn */
        orderCode: {
            type: String,
            required: true,
            trim: true,
        },

        // ── Thông tin sản phẩm (snapshot tại thời điểm mua) ──────────────
        /** ObjectId sản phẩm */
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        /** Snapshot thông tin sản phẩm – không phụ thuộc Product sau này */
        productSnapshot: {
            sku: { type: String, default: '' },
            name: { type: String, default: '' },
            price: { type: Number, default: 0 },
            image: { type: String, default: '' },
            /** Copy từ Product.warrantyText – text mô tả thời hạn BH */
            warrantyText: { type: String, default: '' },
        },

        // ── Khách hàng ──────────────────────────────────────────────────
        /** ObjectId khách hàng (Customer) */
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        /** Tên khách hàng – denormalize */
        customerName: {
            type: String,
            default: '',
            trim: true,
        },
        /** SĐT khách hàng – denormalize */
        customerPhone: {
            type: String,
            default: '',
            trim: true,
        },

        // ── Thời gian bảo hành ──────────────────────────────────────────
        /** Ngày mua hàng (lấy từ order.createdAt) */
        purchaseDate: {
            type: Date,
            required: true,
        },
        /** Ngày bắt đầu BH – = purchaseDate */
        warrantyStartDate: {
            type: Date,
            required: true,
        },
        /** Ngày kết thúc BH – tự động tính = purchaseDate + warrantyMonths */
        warrantyEndDate: {
            type: Date,
            required: true,
        },
        /** Số tháng bảo hành – parse từ product.warrantyText (VD: "12 tháng" → 12) */
        warrantyMonths: {
            type: Number,
            required: true,
            min: 0,
        },

        // ── Trạng thái ──────────────────────────────────────────────────
        /**
         * active  : Còn hạn bảo hành
         * expired : Đã hết hạn bảo hành
         * claimed : Đang có yêu cầu bảo hành đang xử lý
         */
        status: {
            type: String,
            enum: ['active', 'expired', 'claimed'],
            default: 'active',
        },

        // ── Yêu cầu bảo hành ────────────────────────────────────────────
        claims: {
            type: [
                {
                    /** Mã yêu cầu BH – format: CL-YYYY-NNNNN */
                    claimCode: { type: String, default: '' },
                    /** Lý do / loại lỗi */
                    reason: {
                        type: String,
                        enum: [
                            'product_damage',
                            'product_defect',
                            'battery_leak',
                            'charging_issue',
                            'other',
                        ],
                        required: true,
                    },
                    /** Mô tả chi tiết từ khách */
                    description: { type: String, default: '' },
                    /** Ảnh sản phẩm thực tế (tối thiểu 2 ảnh) */
                    images: { type: [String], default: [] },
                    /** Họ tên người yêu cầu BH */
                    customerName: { type: String, default: '', trim: true },
                    /** SĐT người yêu cầu BH */
                    customerPhone: { type: String, default: '', trim: true },
                    /** Email người yêu cầu BH */
                    customerEmail: { type: String, default: '', trim: true, lowercase: true },
                    /** Địa chỉ người yêu cầu BH */
                    customerAddress: { type: String, default: '', trim: true },
                    /** Ghi chú từ khách */
                    notes: { type: String, default: '' },
                    /** Trạng thái xử lý */
                    status: {
                        type: String,
                        enum: ['pending', 'approved', 'rejected', 'completed'],
                        default: 'pending',
                    },
                    /** Ngày tạo yêu cầu */
                    createdAt: { type: Date, default: Date.now },
                    /** Ngày xử lý xong */
                    resolvedAt: { type: Date, default: null },
                    /** Ghi chú xử lý từ nhân viên */
                    resolutionNotes: { type: String, default: '' },
                    /** Người xử lý */
                    resolvedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        default: null,
                    },
                },
            ],
            default: [],
        },

        /** Soft delete */
        isDeleted: {
            type: Boolean,
            default: false,
        },

        // ── Cơ sở bảo hành ────────────────────────────────────────────
        /** ObjectId của chi nhánh thực hiện bảo hành */
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            default: null,
        },
    },
    { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────
/** Tra cứu nhanh bằng mã hóa đơn */
warrantySchema.index({ orderCode: 1 });
/** Liên kết với Order */
warrantySchema.index({ orderId: 1 });
/** Theo khách hàng – xem lịch sử BH */
warrantySchema.index({ customerId: 1 });
/** Theo sản phẩm – thống kê BH theo sản phẩm */
warrantySchema.index({ productId: 1 });
/** Theo trạng thái – filter nhanh */
warrantySchema.index({ status: 1 });
/** Theo ngày kết thúc BH – cron job cập nhật expired */
warrantySchema.index({ warrantyEndDate: 1 });
warrantySchema.index({ isDeleted: 1 });
/** Filter theo trạng thái claim (pending/approved/rejected/completed) */
warrantySchema.index({ 'claims.status': 1 });
/** Tìm kiếm claim theo mã */
warrantySchema.index({ 'claims.claimCode': 1 });
/** Filter theo chi nhánh bảo hành */
warrantySchema.index({ locationId: 1 });

// ── Mã bảo hành tự động ─────────────────────────────────────────────
/**
 * Sinh mã bảo hành: BH-YYYY-NNNNN
 * Số thứ tự tự tăng trong năm, reset mỗi năm mới.
 */
warrantySchema.statics.generateWarrantyCode = async function () {
    const year = new Date().getFullYear();
    const prefix = `BH-${year}-`;

    // Tìm document có warrantyCode bắt đầu bằng prefix, sắp xếp giảm
    const last = await this.findOne({
        warrantyCode: { $regex: `^${prefix}` },
    })
        .sort({ warrantyCode: -1 })
        .lean();

    let nextNum = 1;
    if (last?.warrantyCode) {
        const numStr = last.warrantyCode.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num)) nextNum = num + 1;
    }

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
};

/**
 * Sinh mã yêu cầu BH: CL-YYYY-NNNNN
 */
warrantySchema.statics.generateClaimCode = async function () {
    const year = new Date().getFullYear();
    const prefix = `CL-${year}-`;

    const last = await this.findOne({
        'claims.claimCode': { $regex: `^${prefix}` },
    })
        .sort({ 'claims.claimCode': -1 })
        .lean();

    let nextNum = 1;
    if (last?.claims?.length) {
        const claimCodes = last.claims.map((c) => c.claimCode).filter(Boolean);
        if (claimCodes.length > 0) {
            const maxCode = claimCodes.sort().pop();
            const numStr = maxCode.replace(prefix, '');
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }
    }

    return `${prefix}${String(nextNum).padStart(5, '0')}`;
};

const Warranty = mongoose.model('Warranty', warrantySchema);

export default Warranty;
