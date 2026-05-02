import crypto from 'crypto';
import mongoose from 'mongoose';
import BatteryTradeIn from '../models/BatteryTradeIn.js';
import Location from '../models/Location.js';
import { uploadImageFromBuffer } from '../utils/cloudinary.js';
import { sendBatteryTradeInConfirmationEmail, sendBatteryTradeInStatusUpdateEmail } from '../libs/emailHelper.js';
import { getManagerAllowedLocationIds } from '../libs/managerLocationHelper.js';

/** Admin: luôn được. Các role theo chi nhánh: chỉ khi cơ sở muốn thu cũ thuộc phạm vi được phân. */
async function assertUserCanAccessTradeInDoc(userId, doc) {
    if (!doc) return false;
    const allowedIds = await getManagerAllowedLocationIds(userId);
    if (allowedIds === null) return true; // Admin
    if (!allowedIds.length) return false;
    const prefId = doc.preferredLocationId ? String(doc.preferredLocationId) : '';
    return Boolean(prefId && allowedIds.includes(prefId));
}

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
async function parseBatteryTradeInBody(body, options = {}) {
    const { skipImages = false, skipImageValidation = false } = options;
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
        preferredLocationId = null,
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

    // Validate preferredLocationId
    if (preferredLocationId != null && preferredLocationId !== '') {
        if (!mongoose.Types.ObjectId.isValid(preferredLocationId)) {
            return { ok: false, message: 'Cơ sở muốn thu cũ không hợp lệ' };
        }
        const loc = await Location.findById(preferredLocationId).select('_id isActive').lean();
        if (!loc || !loc.isActive) {
            return { ok: false, message: 'Cơ sở muốn thu cũ không tồn tại hoặc đã ngừng hoạt động' };
        }
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
        if (!skipImageValidation && parsedImages.length < 2) {
            return { ok: false, message: 'Vui lòng tải ít nhất 2 ảnh ắc quy cũ' };
        }
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
        return { ok: false, message: 'Số lượng phải là số nguyên dương (tối thiểu 1)' };
    }
    if (qty > 100) {
        return { ok: false, message: 'Số lượng không được vượt quá 100' };
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
        preferredLocationId: preferredLocationId && mongoose.Types.ObjectId.isValid(preferredLocationId)
            ? new mongoose.Types.ObjectId(preferredLocationId)
            : null,
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
            .populate('preferredLocationId', 'code name address phone')
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
        const parsed = await parseBatteryTradeInBody(req.body);
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
            source: 'online',
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
 * POST /api/battery-trade-in/create-offline - Tạo đơn thu cũ tại cửa hàng (admin/manager/seller)
 * Không yêu cầu ảnh, thông tin địa chỉ đơn giản hơn
 * Cho phép đơn offline chuyển thẳng sang completed
 */
export const createBatteryTradeInOffline = async (req, res) => {
    try {
        // Validate cơ bản cho đơn offline (không bắt buộc địa chỉ)
        const { name, phone, email, batteryName, quantity, manufacturingDate, expiryDate,
                condition, usageDuration, isWorkingWell, pricingType, remainingAmps, weightKg,
                preferredLocationId, note } = req.body || {};

        // Validate required fields
        if (!name?.trim() || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Họ tên phải có ít nhất 2 ký tự' });
        }

        const phoneStr = String(phone || '').trim().replace(/\s/g, '');
        if (!phoneStr || !/^0[2-9][0-9]{8,9}$/.test(phoneStr)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
        }

        const emailStr = String(email || '').trim().toLowerCase();
        if (!emailStr || !/^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?@gmail\.com$/.test(emailStr)) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đúng định dạng Gmail' });
        }

        if (!batteryName?.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên ắc quy' });
        }

        if (!preferredLocationId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn cơ sở tiếp nhận' });
        }

        if (!mongoose.Types.ObjectId.isValid(preferredLocationId)) {
            return res.status(400).json({ success: false, message: 'Cơ sở tiếp nhận không hợp lệ' });
        }

        const loc = await Location.findById(preferredLocationId).select('_id isActive').lean();
        if (!loc || !loc.isActive) {
            return res.status(400).json({ success: false, message: 'Cơ sở tiếp nhận không tồn tại hoặc đã ngừng hoạt động' });
        }

        const qty = parseInt(quantity, 10);
        if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
            return res.status(400).json({ success: false, message: 'Số lượng phải là số nguyên dương (1-100)' });
        }

        if (!manufacturingDate || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày sản xuất và hạn sử dụng' });
        }

        const mfg = new Date(`${manufacturingDate}T00:00:00`);
        const exp = new Date(`${expiryDate}T00:00:00`);
        if (Number.isNaN(mfg.getTime()) || Number.isNaN(exp.getTime()) || exp <= mfg) {
            return res.status(400).json({ success: false, message: 'Ngày không hợp lệ hoặc HSD phải sau NSX' });
        }

        const pricing = pricingType === 'weight' ? 'weight' : 'ampe';
        let remainingAmpsStr = '';
        let weightKgStr = '';

        if (pricing === 'ampe') {
            const v = parseFloat(String(remainingAmps || '').replace(',', '.').trim());
            if (!Number.isFinite(v) || v <= 0 || v >= 200) {
                return res.status(400).json({ success: false, message: 'Số Ampe phải lớn hơn 0 và nhỏ hơn 200' });
            }
            remainingAmpsStr = String(v);
        } else {
            const v = parseFloat(String(weightKg || '').replace(',', '.').trim());
            if (!Number.isFinite(v) || v <= 0 || v >= 200) {
                return res.status(400).json({ success: false, message: 'Cân nặng phải lớn hơn 0 và nhỏ hơn 200 (kg)' });
            }
            weightKgStr = String(v);
        }

        const userId = req.user?._id || null;
        const requestCode = await generateUniqueRequestCode();

        const doc = await BatteryTradeIn.create({
            name: String(name).trim(),
            phone: phoneStr,
            email: emailStr,
            note: String(note || '').trim().slice(0, 500),
            provinceCode: req.body.provinceCode || '',
            provinceName: req.body.provinceName || '',
            districtCode: req.body.districtCode || '',
            districtName: req.body.districtName || '',
            wardCode: req.body.wardCode || '',
            wardName: req.body.wardName || '',
            addressLine: String(req.body.addressLine || '').trim(),
            batteryName: String(batteryName).trim(),
            quantity: qty,
            manufacturingDate: new Date(`${manufacturingDate}T00:00:00`),
            expiryDate: new Date(`${expiryDate}T00:00:00`),
            condition: String(condition || '').trim(),
            usageDuration: String(usageDuration || '').trim(),
            isWorkingWell: isWorkingWell === true ? true : isWorkingWell === false ? false : undefined,
            pricingType: pricing,
            remainingAmps: remainingAmpsStr,
            weightKg: weightKgStr,
            preferredLocationId,
            productId: null,
            source: 'offline',
            assignedTo: userId,
            assignedAt: new Date(),
            handledBy: userId,
        });

        const populated = await BatteryTradeIn.findById(doc._id)
            .populate('productId', 'name sku capacity')
            .populate('preferredLocationId', 'code name address phone')
            .populate('assignedTo', 'firstName lastName')
            .populate('handledBy', 'firstName lastName')
            .lean();

        return res.status(201).json({
            success: true,
            message: 'Đã tạo đơn thu cũ tại cửa hàng thành công.',
            data: { request: populated },
        });
    } catch (error) {
        console.error('createBatteryTradeInOffline error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn thu cũ tại cửa hàng.',
            error: error.message,
        });
    }
};

/**
 * GET /api/battery-trade-in/:id - Chi tiết một yêu cầu (admin/manager)
 */
export const getBatteryTradeInById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        }
        const doc = await BatteryTradeIn.findById(id)
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name address phone')
            .populate('appointmentLocationId', 'code name address phone')
            .populate('preferredLocationId', 'code name address phone')
            .populate('assignedTo', 'firstName lastName')
            .populate('handledBy', 'firstName lastName')
            .lean();
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
        }
        const can = await assertUserCanAccessTradeInDoc(req.user._id, doc);
        if (!can) {
            return res.status(403).json({ success: false, message: 'Không có quyền xem yêu cầu này.' });
        }
        return res.status(200).json({
            success: true,
            data: { request: doc },
        });
    } catch (error) {
        console.error('getBatteryTradeInById error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết yêu cầu thu cũ.',
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
        const sold = req.query.sold?.trim();
        const skip = (page - 1) * limit;

        const query = {};
        if (status) query.status = status;
        if (sold === 'true') {
            query['saleInfo.sold'] = true;
        } else if (sold === 'false') {
            query.$or = [
                { 'saleInfo.sold': { $exists: false } },
                { 'saleInfo.sold': false },
                { 'saleInfo.sold': null },
            ];
        }
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

        const allowedIds = await getManagerAllowedLocationIds(req.user._id);
        if (allowedIds !== null) {
            if (!allowedIds.length) {
                return res.status(200).json({
                    success: true,
                    data: {
                        requests: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            totalPages: 1,
                        },
                    },
                });
            }
            const oids = allowedIds
                .filter((lid) => mongoose.Types.ObjectId.isValid(lid))
                .map((lid) => new mongoose.Types.ObjectId(lid));
            // Manager/Seller chỉ xem đơn có cơ sở khách muốn thu cũ thuộc phạm vi được phân công
            query.preferredLocationId = { $in: oids };
        }

        const [requests, total] = await Promise.all([
            BatteryTradeIn.find(query)
                .populate('productId', 'name sku capacity')
                .populate('completedProductId', 'name sku capacity')
                .populate('locationId', 'code name address phone')
                .populate('appointmentLocationId', 'code name address phone')
                .populate('preferredLocationId', 'code name address phone')
                .populate('assignedTo', 'firstName lastName')
                .populate('handledBy', 'firstName lastName')
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
                .populate('preferredLocationId', 'code name address phone')
                .populate('assignedTo', 'firstName lastName')
                .populate('handledBy', 'firstName lastName')
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

        const oldStatus = existing.status;

        const allowedIds = await getManagerAllowedLocationIds(req.user._id);
        if (allowedIds !== null) {
            const can = await assertUserCanAccessTradeInDoc(req.user._id, existing);
            if (!can) {
                return res.status(403).json({
                    success: false,
                    message: 'Không có quyền thao tác yêu cầu này.',
                });
            }
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
                if (allowedIds !== null && !allowedIds.includes(String(appointmentLocationId))) {
                    return res.status(403).json({
                        success: false,
                        message: 'Không được hẹn tại chi nhánh ngoài phạm vi được phân công.',
                    });
                }
                update = {
                    status: 'contacted',
                    appointmentAt: apt,
                    appointmentLocationId,
                    assignedTo: req.user._id, // Lưu nhân viên được giao
                    assignedAt: new Date(),
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
            // Đơn offline: cho phép pending → completed trực tiếp
            // Đơn online: phải qua contacted
            if (existing.status === 'pending' && existing.source === 'online') {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn online phải xác nhận đã liên hệ với khách trước khi hoàn thành.',
                });
            }
            if (existing.status === 'pending' && existing.source === 'offline') {
                // Đơn offline: cho phép hoàn thành trực tiếp
                // Vẫn cần chọn cơ sở và nhập thông tin
            } else if (existing.status !== 'contacted') {
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
            // Giới hạn số tiền thu mua (không quá 500 triệu)
            if (amt > 500000000) {
                return res.status(400).json({
                    success: false,
                    message: 'Số tiền thu mua không được vượt quá 500 triệu VNĐ.',
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
            if (allowedIds !== null && !allowedIds.includes(String(locationId))) {
                return res.status(403).json({
                    success: false,
                    message: 'Không được ghi nhận hoàn tất tại chi nhánh ngoài phạm vi được phân công.',
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
                handledBy: req.user._id, // Lưu nhân viên hoàn thành
            };
        }

        const doc = await BatteryTradeIn.findByIdAndUpdate(id, update, { new: true })
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name address phone')
            .populate('appointmentLocationId', 'code name address phone')
            .populate('preferredLocationId', 'code name address phone')
            .populate('assignedTo', 'firstName lastName')
            .populate('handledBy', 'firstName lastName')
            .lean();

        // Gửi email thông báo cho khách khi trạng thái thay đổi (trừ pending)
        if (oldStatus !== status && status !== 'pending') {
            try {
                await sendBatteryTradeInStatusUpdateEmail({
                    email: existing.email,
                    name: existing.name,
                    requestCode: existing.requestCode,
                    oldStatus,
                    newStatus: status,
                    appointmentAt: update.appointmentAt || existing.appointmentAt,
                    appointmentLocationName: doc?.appointmentLocationId?.name || doc?.appointmentLocationId?.code || '',
                    appointmentLocationAddress: doc?.appointmentLocationId?.address || '',
                    completedAmount: update.completedAmount ?? existing.completedAmount,
                    cancelledReason: update.cancelledReason || existing.cancelledReason,
                });
            } catch (emailErr) {
                console.error('Gửi email thông báo thu cũ thất bại:', emailErr.message);
            }
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
        const parsed = await parseBatteryTradeInBody(req.body);
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
        const canDoc = await assertUserCanAccessTradeInDoc(req.user._id, existing);
        if (!canDoc) {
            return res.status(403).json({ success: false, message: 'Không có quyền sửa yêu cầu này.' });
        }
        if (existing.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Không thể sửa đơn đã hủy.',
            });
        }

        const allowedIdsPatch = await getManagerAllowedLocationIds(req.user._id);

        const parsed = await parseBatteryTradeInBody(req.body, { skipImages: true });
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

        if (allowedIdsPatch !== null && setDoc.appointmentLocationId) {
            if (!allowedIdsPatch.includes(String(setDoc.appointmentLocationId))) {
                return res.status(403).json({
                    success: false,
                    message: 'Không được đặt lịch tại chi nhánh ngoài phạm vi được phân công.',
                });
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
            if (allowedIdsPatch !== null && !allowedIdsPatch.includes(String(locationId))) {
                return res.status(403).json({
                    success: false,
                    message: 'Không được ghi nhận chi nhánh hoàn tất ngoài phạm vi được phân công.',
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
            .populate('preferredLocationId', 'code name address phone')
            .populate('assignedTo', 'firstName lastName')
            .populate('handledBy', 'firstName lastName')
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

/**
 * POST /api/battery-trade-in/:id/sell
 * Bán acquy thu cũ cho nhà máy tái chế
 */
export const sellBatteryTradeIn = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            buyerName,
            buyerPhone,
            buyerAddress,
            saleQuantity,
            saleUnitPrice,
        } = req.body;

        // Validate request
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID yêu cầu không hợp lệ.',
            });
        }

        const doc = await BatteryTradeIn.findById(id).lean();
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu thu cũ.',
            });
        }

        // Kiểm tra đơn đã hoàn thành thu mua chưa
        if (doc.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể bán acquy từ đơn đã hoàn thành thu mua.',
            });
        }

        // Kiểm tra đã bán chưa
        if (doc.saleInfo?.sold) {
            return res.status(400).json({
                success: false,
                message: 'Đơn này đã được bán cho nhà máy rồi.',
            });
        }

        // Validate thông tin người mua
        if (!buyerName || String(buyerName).trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên nhà máy/tổ chức (ít nhất 2 ký tự).',
            });
        }

        const qty = Number(saleQuantity);
        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng bán phải lớn hơn 0.',
            });
        }

        // Kiểm tra số lượng bán không vượt quá số lượng đã thu
        if (qty > (doc.quantity || 1)) {
            return res.status(400).json({
                success: false,
                message: `Số lượng bán (${qty}) không được vượt quá số lượng đã thu (${doc.quantity || 1}).`,
            });
        }

        const price = Number(saleUnitPrice);
        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Đơn giá bán phải lớn hơn 0.',
            });
        }

        // Giới hạn giá bán hợp lý (không quá 1 tỷ)
        if (price > 1000000000) {
            return res.status(400).json({
                success: false,
                message: 'Đơn giá bán không được vượt quá 1 tỷ VNĐ.',
            });
        }

        // Tính tổng tiền
        const totalAmount = Math.round(qty * price);

        // Tạo mã bán hàng
        const y = new Date().getFullYear();
        const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
        const saleCode = `BH-${y}-${rand}`;

        // Cập nhật saleInfo
        const update = {
            saleInfo: {
                sold: true,
                soldAt: new Date(),
                buyerName: String(buyerName).trim().slice(0, 200),
                buyerPhone: buyerPhone ? String(buyerPhone).trim() : '',
                buyerAddress: buyerAddress ? String(buyerAddress).trim() : '',
                saleQuantity: qty,
                saleUnitPrice: price,
                saleTotalAmount: totalAmount,
                saleCode,
                soldBy: req.user._id,
            },
        };

        const updatedDoc = await BatteryTradeIn.findByIdAndUpdate(id, update, { new: true })
            .populate('productId', 'name sku capacity')
            .populate('completedProductId', 'name sku capacity')
            .populate('locationId', 'code name address phone')
            .populate('preferredLocationId', 'code name address phone')
            .populate('assignedTo', 'firstName lastName')
            .populate('handledBy', 'firstName lastName')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Đã ghi nhận bán acquy thu cũ cho nhà máy thành công.',
            data: {
                request: updatedDoc,
                saleInfo: update.saleInfo,
            },
        });
    } catch (error) {
        console.error('sellBatteryTradeIn error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi ghi nhận bán acquy.',
            error: error.message,
        });
    }
};

/**
 * GET /api/battery-trade-in/stats - Lấy thống kê đơn thu cũ (admin/manager)
 */
export const getBatteryTradeInStats = async (req, res) => {
    try {
        const { startDate, endDate, locationId } = req.query;

        // Build match conditions
        const match = {};

        // Filter by location if manager
        const allowedIds = await getManagerAllowedLocationIds(req.user._id);
        if (allowedIds !== null) {
            if (locationId && allowedIds.includes(locationId)) {
                match.preferredLocationId = new mongoose.Types.ObjectId(locationId);
            } else {
                match.preferredLocationId = { $in: allowedIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        } else if (locationId) {
            match.preferredLocationId = new mongoose.Types.ObjectId(locationId);
        }

        // Filter by date range
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                match.createdAt.$lte = end;
            }
        }

        // Stats by status
        const statusStats = await BatteryTradeIn.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalCompletedAmount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$completedAmount', 0] }, 0] }
                    },
                    totalSaleAmount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$saleInfo.saleTotalAmount', 0] }, 0] }
                    },
                }
            }
        ]);

        // Build status counts
        const statusCounts = {
            pending: 0,
            contacted: 0,
            completed: 0,
            cancelled: 0,
            totalChi: 0,
            totalThu: 0,
        };

        let totalProfit = 0;
        let totalSoldQuantity = 0;
        let totalReceivedQuantity = 0;

        for (const stat of statusStats) {
            if (stat._id === 'pending') statusCounts.pending = stat.count;
            if (stat._id === 'contacted') statusCounts.contacted = stat.count;
            if (stat._id === 'completed') statusCounts.completed = stat.count;
            if (stat._id === 'cancelled') statusCounts.cancelled = stat.count;
            statusCounts.totalChi += stat.totalCompletedAmount || 0;
            statusCounts.totalThu += stat.totalSaleAmount || 0;

            // Get completed items details for profit calculation
            if (stat._id === 'completed') {
                totalProfit = (stat.totalSaleAmount || 0) - (stat.totalCompletedAmount || 0);
            }
        }

        // Total orders
        const totalOrders = statusCounts.pending + statusCounts.contacted + statusCounts.completed + statusCounts.cancelled;

        // Get completed with sale info for detailed stats
        const completedWithSale = await BatteryTradeIn.aggregate([
            { $match: { ...match, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalProfit: {
                        $sum: { $subtract: [{ $ifNull: ['$saleInfo.saleTotalAmount', 0] }, { $ifNull: ['$completedAmount', 0] }] }
                    },
                    totalSoldQuantity: { $sum: { $ifNull: ['$saleInfo.saleQuantity', 0] } },
                    totalReceivedQuantity: { $sum: '$quantity' },
                    count: { $sum: 1 },
                }
            }
        ]);

        // Get location stats
        const locationStats = await BatteryTradeIn.aggregate([
            { $match: { ...match, status: 'completed' } },
            {
                $group: {
                    _id: '$preferredLocationId',
                    count: { $sum: 1 },
                    chi: { $sum: { $ifNull: ['$completedAmount', 0] } },
                    thu: { $sum: { $ifNull: ['$saleInfo.saleTotalAmount', 0] } },
                }
            },
            { $limit: 10 }
        ]);

        // Populate location names
        const locationIds = locationStats.map(s => s._id).filter(Boolean);
        const locations = await Location.find({ _id: { $in: locationIds } }).select('code name').lean();
        const locationMap = {};
        locations.forEach(loc => { locationMap[loc._id.toString()] = loc; });

        const locationBreakdown = locationStats.map(stat => ({
            locationId: stat._id?._id || stat._id,
            locationName: locationMap[stat._id?.toString()]?.name || locationMap[stat._id]?.name || 'Không xác định',
            locationCode: locationMap[stat._id?.toString()]?.code || locationMap[stat._id]?.code || '',
            count: stat.count,
            chi: stat.chi,
            thu: stat.thu,
            loi: stat.thu - stat.chi,
        }));

        // Recent orders
        const recentOrders = await BatteryTradeIn.find(match)
            .sort({ createdAt: -1 })
            .limit(5)
            .select('requestCode status batteryName completedAmount saleInfo.saleTotalAmount createdAt')
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                totalOrders,
                pending: statusCounts.pending,
                contacted: statusCounts.contacted,
                completed: statusCounts.completed,
                cancelled: statusCounts.cancelled,
                needProcess: statusCounts.pending + statusCounts.contacted,
                totalChi: statusCounts.totalChi,
                totalThu: statusCounts.totalThu,
                loi: statusCounts.totalThu - statusCounts.totalChi,
                locationBreakdown,
                recentOrders: recentOrders.map(o => ({
                    _id: o._id,
                    requestCode: o.requestCode,
                    status: o.status,
                    batteryName: o.batteryName,
                    createdAt: o.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error('getBatteryTradeInStats error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê.',
            error: error.message,
        });
    }
};
