import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        // Snapshot thông tin tại thời điểm thêm vào giỏ (optional)
        priceSnapshot: {
            type: Number,
            default: 0,
        },
        nameSnapshot: {
            type: String,
            default: '',
        },
        imageSnapshot: {
            type: String,
            default: '',
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    { timestamps: true }
);

cartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;

