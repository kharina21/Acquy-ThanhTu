import BatteryTradeIn from '../models/BatteryTradeIn.js';
import Product from '../models/Product.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';

/**
 * POST /api/battery-trade-in/upload-image - Upload ảnh acquy (public)
 */
export const uploadBatteryImage = async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(503).json({
                message: 'Chưa cấu hình Cloudinary.',
            });
        }
        const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);
        if (files.length === 0 || !files[0].buffer) {
            return res.status(400).json({ message: 'Vui lòng gửi ít nhất một file ảnh (field: image)' });
        }
        const urls = [];
        for (const file of files) {
            if (!file.buffer) continue;
            const result = await uploadImageFromBuffer(file.buffer, file.mimetype, 'battery-trade-in');
            urls.push(result.url);
        }
        if (urls.length === 0) {
            return res.status(400).json({ message: 'Không có file ảnh hợp lệ' });
        }
        res.status(200).json({ success: true, data: { url: urls[0], urls } });
    } catch (error) {
        console.error('uploadBatteryImage error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tải ảnh lên.', error: error.message });
    }
};

/**
 * POST /api/battery-trade-in - Gửi yêu cầu thu cũ (public, không cần đăng nhập)
 */
export const submitBatteryTradeIn = async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            address,
            note,
            productId,
            batteryName,
            images,
            quantity,
            manufacturingDate,
            expiryDate,
            condition,
            usageDuration,
            isWorkingWell,
            pricingType,
            remainingAmps,
            weightKg,
        } = req.body;

        if (!name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ họ tên, số điện thoại và email.',
            });
        }

        const userId = req.user?._id || null;

        let parsedImages = [];
        if (Array.isArray(images)) parsedImages = images;
        else if (typeof images === 'string') {
            try { parsedImages = JSON.parse(images || '[]'); } catch { parsedImages = []; }
        }

        const doc = await BatteryTradeIn.create({
            name: String(name).trim(),
            phone: String(phone).trim(),
            email: String(email).trim(),
            address: address ? String(address).trim() : '',
            note: note ? String(note).trim() : '',
            userId,
            productId: productId && productId !== 'other' ? productId : null,
            batteryName: batteryName ? String(batteryName).trim() : '',
            images: parsedImages.filter(Boolean),
            quantity: Math.max(1, parseInt(quantity, 10) || 1),
            manufacturingDate: manufacturingDate || null,
            expiryDate: expiryDate || null,
            condition: condition ? String(condition).trim() : '',
            usageDuration: usageDuration ? String(usageDuration).trim() : '',
            isWorkingWell: typeof isWorkingWell === 'boolean' ? isWorkingWell : undefined,
            pricingType: pricingType === 'weight' ? 'weight' : 'ampe',
            remainingAmps: remainingAmps ? String(remainingAmps).trim() : '',
            weightKg: weightKg ? String(weightKg).trim() : '',
        });

        const populated = await BatteryTradeIn.findById(doc._id)
            .populate('productId', 'name sku capacity')
            .lean();

        return res.status(201).json({
            success: true,
            message: 'Đã gửi yêu cầu thu cũ thành công. Cửa hàng sẽ liên hệ với bạn sớm.',
            data: { request: populated },
        });
    } catch (error) {
        console.error('submitBatteryTradeIn error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi yêu cầu thu cũ.',
            error: error.message,
        });
    }
};

/**
 * GET /api/battery-trade-in - Lấy danh sách yêu cầu (admin/manager)
 */
export const getBatteryTradeInList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status?.trim();
        const search = req.query.search?.trim();
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { batteryName: { $regex: search, $options: 'i' } },
            ];
        }

        const [requests, total] = await Promise.all([
            BatteryTradeIn.find(query)
                .populate('productId', 'name sku capacity')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BatteryTradeIn.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (error) {
        console.error('getBatteryTradeInList error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách yêu cầu thu cũ.',
            error: error.message,
        });
    }
};

/**
 * PATCH /api/battery-trade-in/:id - Cập nhật trạng thái (admin/manager)
 */
export const updateBatteryTradeInStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'contacted', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ.',
            });
        }

        const doc = await BatteryTradeIn.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        )
            .populate('productId', 'name sku capacity')
            .lean();

        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu thu cũ.',
            });
        }

        return res.status(200).json({
            success: true,
            data: { request: doc },
        });
    } catch (error) {
        console.error('updateBatteryTradeInStatus error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái.',
            error: error.message,
        });
    }
};
