import crypto from 'crypto';
import mongoose from 'mongoose';
import BatteryTradeIn from '../models/BatteryTradeIn.js';
import Location from '../models/Location.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';
import { sendBatteryTradeInConfirmationEmail } from '../libs/emailHelper.js';

function getFrontendBaseUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

/** Mã dạng TC-YYYY-8HEX (khó đoán, tra cứu kèm email) */
async function generateUniqueRequestCode() {
    for (let i = 0; i < 10; i++) {
        const y = new Date().getFullYear();
        const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
        const code = `TC-${y}-${rand}`;
        const exists = await BatteryTradeIn.findOne({ requestCode: code }).select('_id').lean();
        if (!exists) return code;
    }
    throw new Error('Không tạo được mã yêu cầu');
}

const LOOKUP_STATUS_LABEL = {
    pending: 'Đang xử lý',
    contacted: 'Đã liên hệ',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
};

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
 * Validate body gửi / sửa yêu cầu thu cũ (dùng chung create, update-by-lookup, admin sửa chi tiết).
 * @param {{ skipImages?: boolean }} [options] — admin chỉ sửa thông tin, không đụng ảnh
 * @returns {{ ok: true, data: object } | { ok: false, message: string }}
 */
function parseBatteryTradeInBody(body, options = {}) {
    const { skipImages = false } = options;
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
    } = body || {};

    const errName = validateTradeInName(name);
    const errPhone = validatePhoneVN(phone);
    const errEmail = validateGmail(email);
    if (errName || errPhone || errEmail) {
        return { ok: false, message: errName || errPhone || errEmail };
    }

    const addrLineStr = String(addressLine || '').trim();
    const errAddrLine = validateAddressLine(addrLineStr);
    const errProvince = !String(provinceCode || '').trim() ? 'Vui lòng chọn Tỉnh/Thành phố' : null;
    const errDistrict = !String(districtCode || '').trim() ? 'Vui lòng chọn Quận/Huyện' : null;
    const errWard = !String(wardCode || '').trim() ? 'Vui lòng chọn Phường/Xã' : null;
    if (errAddrLine || errProvince || errDistrict || errWard) {
        return { ok: false, message: errAddrLine || errProvince || errDistrict || errWard };
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
        return { ok: false, message: 'Địa chỉ đầy đủ phải có ít nhất 10 ký tự' };
    }
    if (shippingAddress.length > 300) {
        return { ok: false, message: 'Địa chỉ không quá 300 ký tự' };
    }

    const noteStr = String(note || '').trim();
    if (noteStr.length > 500) {
        return { ok: false, message: 'Ghi chú không quá 500 ký tự' };
    }

    const batteryNameStr = String(batteryName || '').trim();
    if (!batteryNameStr) {
        return { ok: false, message: 'Vui lòng nhập tên ắc quy' };
    }

    let parsedImages = [];
    if (!skipImages) {
        if (Array.isArray(images)) parsedImages = images;
        else if (typeof images === 'string') {
            try {
                parsedImages = JSON.parse(images || '[]');
            } catch {
                parsedImages = [];
            }
        }
        parsedImages = parsedImages.filter(Boolean);
        if (parsedImages.length < 2) {
            return { ok: false, message: 'Vui lòng tải ít nhất 2 ảnh ắc quy cũ' };
        }
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
        return { ok: false, message: 'Số lượng phải là số nguyên dương (tối thiểu 1)' };
    }

    if (!manufacturingDate || !expiryDate) {
        return { ok: false, message: 'Vui lòng chọn đầy đủ ngày sản xuất và hạn sử dụng' };
    }
    const mfg = new Date(manufacturingDate);
    const exp = new Date(expiryDate);
    if (Number.isNaN(mfg.getTime()) || Number.isNaN(exp.getTime())) {
        return { ok: false, message: 'Ngày sản xuất hoặc hạn sử dụng không hợp lệ' };
    }
    if (exp <= mfg) {
        return { ok: false, message: 'Hạn sử dụng phải sau ngày sản xuất' };
    }

    const pricing = pricingType === 'weight' ? 'weight' : 'ampe';
    let remainingAmpsStr = '';
    let weightKgStr = '';
    if (pricing === 'ampe') {
        const v = parseMetricValue(remainingAmps);
        if (v == null) {
            return { ok: false, message: 'Vui lòng nhập số Ampe (Ah)' };
        }
        if (v <= 0 || v >= 200) {
            return { ok: false, message: 'Số Ampe phải lớn hơn 0 và nhỏ hơn 200' };
        }
        remainingAmpsStr = String(v);
    } else {
        const v = parseMetricValue(weightKg);
        if (v == null) {
            return { ok: false, message: 'Vui lòng nhập cân nặng (kg)' };
        }
        if (v <= 0 || v >= 200) {
            return { ok: false, message: 'Cân nặng phải lớn hơn 0 và nhỏ hơn 200 (kg)' };
        }
        weightKgStr = String(v);
    }

    const data = {
        name: String(name).trim(),
        phone: String(phone).trim().replace(/\s/g, ''),
        email: String(email).trim().toLowerCase(),
        address: shippingAddress,
        provinceCode: String(provinceCode || '').trim(),
        provinceName: String(provinceName || '').trim(),
        districtCode: String(districtCode || '').trim(),
        districtName: String(districtName || '').trim(),
        wardCode: String(wardCode || '').trim(),
        wardName: String(wardName || '').trim(),
        addressLine: addrLineStr,
        note: noteStr,
        batteryName: batteryNameStr,
        quantity: qty,
        manufacturingDate: mfg,
        expiryDate: exp,
        condition: condition ? String(condition).trim() : '',
        usageDuration: usageDuration ? String(usageDuration).trim() : '',
        isWorkingWell: typeof isWorkingWell === 'boolean' ? isWorkingWell : undefined,
        pricingType: pricing,
        remainingAmps: remainingAmpsStr,
        weightKg: weightKgStr,
    };
    if (!skipImages) {
        data.images = parsedImages;
    }

    return { ok: true, data };
}

function validateCompletedProductName(nameStr) {
    const s = String(nameStr || '').trim();
    if (s.length < 2) return 'Tên sản phẩm thu được phải có ít nhất 2 ký tự';
    if (s.length > 200) return 'Tên sản phẩm không quá 200 ký tự';
    return null;
}

function assertLookupCodeEmail(code, email) {
    const c = String(code || '').trim().toUpperCase();
    const em = String(email || '').trim().toLowerCase();
    if (!c || !em) {
        return { ok: false, message: 'Vui lòng nhập mã yêu cầu và email Gmail.' };
    }
    if (!/^TC-\d{4}-[0-9A-F]{8}$/.test(c)) {
        return { ok: false, message: 'Mã yêu cầu không đúng định dạng (ví dụ: TC-2025-AB12CD34).' };
    }
    const errEmail = validateGmail(em);
    if (errEmail) return { ok: false, message: errEmail };
    return { ok: true, code: c, email: em };
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
 * POST /api/battery-trade-in/lookup - Tra cứu yêu cầu thu cũ theo mã + email Gmail (public)
 */
export const lookupBatteryTradeIn = async (req, res) => {
    try {
        const rawCode = String(req.body.code ?? req.body.requestCode ?? '').trim();
        const email = String(req.body.email ?? '').trim().toLowerCase();
        const code = rawCode.toUpperCase();

        if (!code || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mã yêu cầu và email Gmail.',
            });
        }
        if (!/^TC-\d{4}-[0-9A-F]{8}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Mã yêu cầu không đúng định dạng (ví dụ: TC-2025-AB12CD34).',
            });
        }
        const errEmail = validateGmail(email);
        if (errEmail) {
            return res.status(400).json({ success: false, message: errEmail });
        }

        const doc = await BatteryTradeIn.findOne({ requestCode: code, email })
            .populate('appointmentLocationId', 'code name address phone')
            .lean();
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu. Kiểm tra lại mã và email đã dùng khi gửi đơn.',
            });
        }

        const aptLoc = doc.appointmentLocationId;
        const pending = doc.status === 'pending';
        return res.status(200).json({
            success: true,
            data: {
                requestCode: doc.requestCode,
                status: doc.status,
                statusLabel: LOOKUP_STATUS_LABEL[doc.status] || doc.status,
                batteryName: doc.batteryName,
                quantity: doc.quantity,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                name: doc.name,
                phone: doc.phone,
                canEdit: pending,
                canDelete: pending,
                appointmentAt: doc.appointmentAt,
                appointmentLocation: aptLoc
                    ? {
                          code: aptLoc.code,
                          name: aptLoc.name,
                          address: aptLoc.address,
                          phone: aptLoc.phone,
                      }
                    : null,
            },
        });
    } catch (error) {
        console.error('lookupBatteryTradeIn error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tra cứu yêu cầu.',
            error: error.message,
        });
    }
};

/**
 * POST /api/battery-trade-in - Gửi yêu cầu thu cũ (public, không cần đăng nhập)
 */
export const submitBatteryTradeIn = async (req, res) => {
    try {
        const parsed = parseBatteryTradeInBody(req.body);
        if (!parsed.ok) {
            return res.status(400).json({
                success: false,
                message: parsed.message,
            });
        }

        const userId = req.user?._id || null;
        const requestCode = await generateUniqueRequestCode();

        const doc = await BatteryTradeIn.create({
            ...parsed.data,
            requestCode,
            userId,
            productId: null,
        });

        const populated = await BatteryTradeIn.findById(doc._id)
            .populate('productId', 'name sku capacity')
            .lean();

        try {
            const lookupPageUrl = `${getFrontendBaseUrl()}/battery-trade-in/tra-cuu`;
            await sendBatteryTradeInConfirmationEmail(
                populated.email,
                populated.name,
                populated.requestCode,
                lookupPageUrl,
            );
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
                { requestCode: { $regex: search, $options: 'i' } },
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
                .populate('locationId', 'code name address phone')
                .populate('appointmentLocationId', 'code name address phone')
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
 * GET /api/battery-trade-in/mine - Đơn thu cũ của tài khoản đang đăng nhập (userId)
 */
export const getMyBatteryTradeIns = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            BatteryTradeIn.find({ userId })
                .populate('appointmentLocationId', 'code name address phone')
                .populate('completedProductId', 'name sku capacity')
                .populate('locationId', 'code name address phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BatteryTradeIn.countDocuments({ userId }),
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
        console.error('getMyBatteryTradeIns error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải đơn thu cũ của bạn.',
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
            completedProductName,
            completedAmount,
            completedNote,
            locationId,
            appointmentAt,
            appointmentLocationId,
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

            if (status === 'contacted') {
                if (!appointmentAt) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vui lòng chọn thời gian đã xác nhận với khách.',
                    });
                }
                const apt = new Date(appointmentAt);
                if (Number.isNaN(apt.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Thời gian hẹn không hợp lệ.',
                    });
                }
                if (!appointmentLocationId || !mongoose.Types.ObjectId.isValid(appointmentLocationId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vui lòng chọn cơ sở / chi nhánh đã xác nhận với khách.',
                    });
                }
                const loc = await Location.findById(appointmentLocationId).select('_id isActive').lean();
                if (!loc || !loc.isActive) {
                    return res.status(400).json({
                        success: false,
                        message: 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.',
                    });
                }
                update = {
                    status: 'contacted',
                    appointmentAt: apt,
                    appointmentLocationId,
                };
            } else {
                update = {
                    status: 'pending',
                    appointmentAt: null,
                    appointmentLocationId: null,
                };
            }
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
                completedProductName: '',
                completedAmount: null,
                completedAt: null,
                completedNote: '',
                appointmentAt: null,
                appointmentLocationId: null,
            };
        } else if (status === 'completed') {
            if (existing.status !== 'contacted') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể hoàn thành sau khi khách đã mang acquy đến (trạng thái đã liên hệ).',
                });
            }
            const nameErr = validateCompletedProductName(completedProductName);
            if (nameErr) {
                return res.status(400).json({
                    success: false,
                    message: nameErr,
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
            const loc = await Location.findById(locationId).select('_id isActive').lean();
            if (!loc || !loc.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.',
                });
            }
            const productLabel = String(completedProductName || '').trim();
            update = {
                status: 'completed',
                completedProductId: null,
                completedProductName: productLabel,
                completedAmount: Math.round(amt),
                completedAt: new Date(),
                completedNote: completedNote ? String(completedNote).trim().slice(0, 500) : '',
                locationId,
            };
        }

        const doc = await BatteryTradeIn.findByIdAndUpdate(id, update, { new: true })
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name address phone')
            .populate('appointmentLocationId', 'code name address phone')
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

/**
 * GET /api/battery-trade-in/lookup/prefill?code=&email= — Dữ liệu form sửa (chỉ khi đang xử lý)
 */
export const getBatteryTradeInPrefill = async (req, res) => {
    try {
        const a = assertLookupCodeEmail(req.query.code, req.query.email);
        if (!a.ok) {
            return res.status(400).json({ success: false, message: a.message });
        }
        const doc = await BatteryTradeIn.findOne({ requestCode: a.code, email: a.email }).lean();
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu. Kiểm tra lại mã và email.',
            });
        }
        if (doc.status !== 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ có thể sửa khi đơn đang xử lý (chưa xác nhận đã liên hệ).',
            });
        }
        return res.status(200).json({ success: true, data: doc });
    } catch (error) {
        console.error('getBatteryTradeInPrefill error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải dữ liệu.',
            error: error.message,
        });
    }
};

/**
 * PATCH /api/battery-trade-in/lookup — Khách sửa đơn (mã + Gmail, chỉ pending)
 */
export const updateBatteryTradeInByLookup = async (req, res) => {
    try {
        const a = assertLookupCodeEmail(req.body.code, req.body.email);
        if (!a.ok) {
            return res.status(400).json({ success: false, message: a.message });
        }
        const parsed = parseBatteryTradeInBody(req.body);
        if (!parsed.ok) {
            return res.status(400).json({ success: false, message: parsed.message });
        }
        if (parsed.data.email !== a.email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng dùng đúng Gmail đã đăng ký với mã yêu cầu (không đổi email ở đây).',
            });
        }

        const existing = await BatteryTradeIn.findOne({ requestCode: a.code, email: a.email });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu.',
            });
        }
        if (existing.status !== 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ có thể sửa khi đơn đang xử lý.',
            });
        }

        const { isWorkingWell, ...rest } = parsed.data;
        const setDoc = { ...rest };
        if (typeof isWorkingWell === 'boolean') setDoc.isWorkingWell = isWorkingWell;

        const updated = await BatteryTradeIn.findByIdAndUpdate(existing._id, { $set: setDoc }, { new: true })
            .populate('productId', 'name sku capacity')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật yêu cầu.',
            data: { request: updated },
        });
    } catch (error) {
        console.error('updateBatteryTradeInByLookup error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật yêu cầu.',
            error: error.message,
        });
    }
};

/**
 * POST /api/battery-trade-in/lookup/delete — Khách xóa yêu cầu (mã + Gmail, chỉ pending)
 */
export const deleteBatteryTradeInByLookup = async (req, res) => {
    try {
        const a = assertLookupCodeEmail(req.body.code, req.body.email);
        if (!a.ok) {
            return res.status(400).json({ success: false, message: a.message });
        }
        const existing = await BatteryTradeIn.findOne({ requestCode: a.code, email: a.email });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu.',
            });
        }
        if (existing.status !== 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ có thể xóa khi đơn đang xử lý.',
            });
        }
        await BatteryTradeIn.deleteOne({ _id: existing._id });
        return res.status(200).json({ success: true, message: 'Đã xóa yêu cầu.' });
    } catch (error) {
        console.error('deleteBatteryTradeInByLookup error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa yêu cầu.',
            error: error.message,
        });
    }
};

async function mergeAppointmentPatchIfPresent(body, update) {
    const rawAt = body.appointmentAt;
    if (rawAt == null || String(rawAt).trim() === '') return;
    const apt = new Date(rawAt);
    if (Number.isNaN(apt.getTime())) {
        throw new Error('INVALID_APPOINTMENT');
    }
    const alid = body.appointmentLocationId;
    if (!alid || !mongoose.Types.ObjectId.isValid(alid)) {
        throw new Error('INVALID_APPOINTMENT_LOC');
    }
    const loc = await Location.findById(alid).select('_id isActive').lean();
    if (!loc || !loc.isActive) {
        throw new Error('LOC_INACTIVE');
    }
    update.appointmentAt = apt;
    update.appointmentLocationId = alid;
}

/**
 * PATCH /api/battery-trade-in/:id/details — Admin sửa thông tin đơn (trừ đơn đã hủy)
 */
export const updateBatteryTradeInDetailsByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await BatteryTradeIn.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thu cũ.' });
        }
        if (existing.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Không thể sửa đơn đã hủy.',
            });
        }

        const parsed = parseBatteryTradeInBody(req.body, { skipImages: true });
        if (!parsed.ok) {
            return res.status(400).json({ success: false, message: parsed.message });
        }

        const { isWorkingWell, ...rest } = parsed.data;
        const setDoc = { ...rest };
        if (typeof isWorkingWell === 'boolean') setDoc.isWorkingWell = isWorkingWell;

        if (['contacted', 'completed'].includes(existing.status)) {
            try {
                await mergeAppointmentPatchIfPresent(req.body, setDoc);
            } catch (e) {
                if (e.message === 'INVALID_APPOINTMENT') {
                    return res.status(400).json({ success: false, message: 'Thời gian hẹn không hợp lệ.' });
                }
                if (e.message === 'INVALID_APPOINTMENT_LOC') {
                    return res.status(400).json({
                        success: false,
                        message: 'Vui lòng chọn cơ sở / chi nhánh hợp lệ khi sửa lịch hẹn.',
                    });
                }
                if (e.message === 'LOC_INACTIVE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.',
                    });
                }
                throw e;
            }
        }

        if (existing.status === 'completed') {
            const { completedAmount, completedProductName, locationId, completedNote } = req.body;
            const amt = Number(completedAmount);
            if (!Number.isFinite(amt) || amt <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Số tiền thu mua phải lớn hơn 0.',
                });
            }
            const nameErr = validateCompletedProductName(completedProductName);
            if (nameErr) {
                return res.status(400).json({ success: false, message: nameErr });
            }
            if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng chọn chi nhánh (hoàn tất).',
                });
            }
            const loc = await Location.findById(locationId).select('_id isActive').lean();
            if (!loc || !loc.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.',
                });
            }
            setDoc.completedAmount = Math.round(amt);
            setDoc.completedProductId = null;
            setDoc.completedProductName = String(completedProductName || '').trim();
            setDoc.locationId = locationId;
            setDoc.completedNote = completedNote != null ? String(completedNote).trim().slice(0, 500) : '';
        }

        const doc = await BatteryTradeIn.findByIdAndUpdate(id, { $set: setDoc }, { new: true })
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name address phone')
            .populate('appointmentLocationId', 'code name address phone')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật thông tin đơn.',
            data: { request: doc },
        });
    } catch (error) {
        console.error('updateBatteryTradeInDetailsByAdmin error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đơn.',
            error: error.message,
        });
    }
};
