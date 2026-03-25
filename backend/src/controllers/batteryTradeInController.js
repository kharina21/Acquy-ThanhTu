import mongoose from 'mongoose';
import BatteryTradeIn from '../models/BatteryTradeIn.js';
import Product from '../models/Product.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';
import { sendBatteryTradeInConfirmationEmail } from '../libs/emailHelper.js';

function validateTradeInName(name) {
    const s = String(name || '').trim();
    if (!s) return 'Vui lòng nhập họ tên';
    if (s.length < 2 || s.length > 30) return 'Họ tên phải từ 2–30 ký tự';
    if (!/^[\p{L}\s.'-]+$/u.test(s)) return 'Họ tên chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
    return null;
}

function validatePhoneVN(phone) {
    const s = String(phone || '').trim().replace(/\s/g, '');
    if (!s) return 'Vui lòng nhập số điện thoại';
    if (!/^0[2-9][0-9]{8,9}$/.test(s)) return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
    return null;
}

function validateGmail(email) {
    const s = String(email || '').trim().toLowerCase();
    if (!s) return 'Vui lòng nhập email';
    if (!/^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?@gmail\.com$/.test(s)) {
        return 'Vui lòng nhập đúng định dạng Gmail (ví dụ: ten@gmail.com)';
    }
    return null;
}

function validateAddressLine(addr) {
    const s = String(addr || '').trim();
    if (!s) return 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)';
    if (s.length < 10) return 'Địa chỉ phải có ít nhất 10 ký tự';
    if (s.length > 200) return 'Địa chỉ không quá 200 ký tự';
    return null;
}

function parseMetricValue(str) {
    const n = parseFloat(String(str || '').replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    return n;
}

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
            note,
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
            provinceCode = '',
            provinceName = '',
            districtCode = '',
            districtName = '',
            wardCode = '',
            wardName = '',
            addressLine = '',
        } = req.body;

        const errName = validateTradeInName(name);
        const errPhone = validatePhoneVN(phone);
        const errEmail = validateGmail(email);
        if (errName || errPhone || errEmail) {
            return res.status(400).json({
                success: false,
                message: errName || errPhone || errEmail,
            });
        }

        const addrLineStr = String(addressLine || '').trim();
        const errAddrLine = validateAddressLine(addrLineStr);
        const errProvince = !String(provinceCode || '').trim() ? 'Vui lòng chọn Tỉnh/Thành phố' : null;
        const errDistrict = !String(districtCode || '').trim() ? 'Vui lòng chọn Quận/Huyện' : null;
        const errWard = !String(wardCode || '').trim() ? 'Vui lòng chọn Phường/Xã' : null;
        if (errAddrLine || errProvince || errDistrict || errWard) {
            return res.status(400).json({
                success: false,
                message: errAddrLine || errProvince || errDistrict || errWard,
            });
        }

        const shippingAddress = [
            addrLineStr,
            String(wardName || '').trim(),
            String(districtName || '').trim(),
            String(provinceName || '').trim(),
        ]
            .filter(Boolean)
            .join(', ');

        if (!shippingAddress || shippingAddress.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ đầy đủ phải có ít nhất 10 ký tự',
            });
        }
        if (shippingAddress.length > 300) {
            return res.status(400).json({
                success: false,
                message: 'Địa chỉ không quá 300 ký tự',
            });
        }

        const noteStr = String(note || '').trim();
        if (noteStr.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Ghi chú không quá 500 ký tự',
            });
        }

        const batteryNameStr = String(batteryName || '').trim();
        if (!batteryNameStr) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên ắc quy',
            });
        }

        const userId = req.user?._id || null;

        let parsedImages = [];
        if (Array.isArray(images)) parsedImages = images;
        else if (typeof images === 'string') {
            try { parsedImages = JSON.parse(images || '[]'); } catch { parsedImages = []; }
        }
        parsedImages = parsedImages.filter(Boolean);
        if (parsedImages.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng tải ít nhất 2 ảnh ắc quy cũ',
            });
        }

        const qty = parseInt(quantity, 10);
        if (!Number.isInteger(qty) || qty < 1) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải là số nguyên dương (tối thiểu 1)',
            });
        }

        if (!manufacturingDate || !expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn đầy đủ ngày sản xuất và hạn sử dụng',
            });
        }
        const mfg = new Date(manufacturingDate);
        const exp = new Date(expiryDate);
        if (Number.isNaN(mfg.getTime()) || Number.isNaN(exp.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Ngày sản xuất hoặc hạn sử dụng không hợp lệ',
            });
        }
        if (exp <= mfg) {
            return res.status(400).json({
                success: false,
                message: 'Hạn sử dụng phải sau ngày sản xuất',
            });
        }

        const pricing = pricingType === 'weight' ? 'weight' : 'ampe';
        let remainingAmpsStr = '';
        let weightKgStr = '';
        if (pricing === 'ampe') {
            const v = parseMetricValue(remainingAmps);
            if (v == null) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập số Ampe (Ah)',
                });
            }
            if (v <= 0 || v >= 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Số Ampe phải lớn hơn 0 và nhỏ hơn 200',
                });
            }
            remainingAmpsStr = String(v);
        } else {
            const v = parseMetricValue(weightKg);
            if (v == null) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập cân nặng (kg)',
                });
            }
            if (v <= 0 || v >= 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Cân nặng phải lớn hơn 0 và nhỏ hơn 200 (kg)',
                });
            }
            weightKgStr = String(v);
        }

        const doc = await BatteryTradeIn.create({
            name: String(name).trim(),
            phone: String(phone).trim().replace(/\s/g, ''),
            email: String(email).trim().toLowerCase(),
            address: shippingAddress,
            note: noteStr,
            userId,
            productId: null,
            batteryName: batteryNameStr,
            images: parsedImages,
            quantity: qty,
            manufacturingDate: mfg,
            expiryDate: exp,
            condition: condition ? String(condition).trim() : '',
            usageDuration: usageDuration ? String(usageDuration).trim() : '',
            isWorkingWell: typeof isWorkingWell === 'boolean' ? isWorkingWell : undefined,
            pricingType: pricing,
            remainingAmps: remainingAmpsStr,
            weightKg: weightKgStr,
        });

        const populated = await BatteryTradeIn.findById(doc._id)
            .populate('productId', 'name sku capacity')
            .lean();

        try {
            await sendBatteryTradeInConfirmationEmail(populated.email, populated.name);
        } catch (emailErr) {
            console.error('Gửi email xác nhận thu cũ thất bại:', emailErr.message);
        }

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
                .populate('completedProductId', 'name sku capacity')
                .populate('locationId', 'code name')
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
        const {
            status,
            cancelledReason,
            completedProductId,
            completedAmount,
            completedNote,
            locationId,
        } = req.body;

        if (!['pending', 'contacted', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ.',
            });
        }

        const existing = await BatteryTradeIn.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu thu cũ.',
            });
        }

        if (['completed', 'cancelled'].includes(existing.status) && status !== existing.status) {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi trạng thái sau khi đã hoàn thành hoặc đã hủy.',
            });
        }

        let update = {};

        if (status === 'pending' || status === 'contacted') {
            if (['completed', 'cancelled'].includes(existing.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể đặt lại trạng thái này.',
                });
            }
            if (status === 'contacted' && existing.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể chuyển sang "Đã liên hệ" từ trạng thái đang xử lý.',
                });
            }
            if (status === 'pending' && existing.status !== 'contacted') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể chuyển về đang xử lý từ đã liên hệ.',
                });
            }
            update = { status };
        } else if (status === 'cancelled') {
            if (!['pending', 'contacted'].includes(existing.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể từ chối khi đơn đang xử lý hoặc đã liên hệ.',
                });
            }
            update = {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledReason: cancelledReason ? String(cancelledReason).trim().slice(0, 500) : '',
                locationId: null,
                completedProductId: null,
                completedAmount: null,
                completedAt: null,
                completedNote: '',
            };
        } else if (status === 'completed') {
            if (existing.status !== 'contacted') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể hoàn thành sau khi khách đã mang acquy đến (trạng thái đã liên hệ).',
                });
            }
            if (!completedProductId || !mongoose.Types.ObjectId.isValid(completedProductId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn sản phẩm acquy thu được.',
                });
            }
            const amt = Number(completedAmount);
            if (!Number.isFinite(amt) || amt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Số tiền thu mua phải lớn hơn 0.',
                });
            }
            if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn chi nhánh.',
                });
            }
            const product = await Product.findById(completedProductId).select('_id').lean();
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: 'Sản phẩm không tồn tại.',
                });
            }
            update = {
                status: 'completed',
                completedProductId,
                completedAmount: Math.round(amt),
                completedAt: new Date(),
                completedNote: completedNote ? String(completedNote).trim().slice(0, 500) : '',
                locationId,
            };
        }

        const doc = await BatteryTradeIn.findByIdAndUpdate(id, update, { new: true })
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name')
            .lean();

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
