import mongoose from 'mongoose';
import ShippingAddress from '../models/ShippingAddress.js';

const toResponse = (doc) => {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return {
        _id: o._id,
        userId: o.userId,
        label: o.label ?? '',
        recipientName: o.recipientName,
        shippingPhone: o.shippingPhone,
        provinceCode: o.provinceCode,
        provinceName: o.provinceName,
        districtCode: o.districtCode,
        districtName: o.districtName,
        wardCode: o.wardCode,
        wardName: o.wardName,
        addressLine: o.addressLine,
        isDefault: !!o.isDefault,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
};

const unsetOtherDefaults = async (userId, exceptId) => {
    await ShippingAddress.updateMany(
        { userId, _id: { $ne: exceptId } },
        { $set: { isDefault: false } }
    );
};

export const listMyShippingAddresses = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const list = await ShippingAddress.find({ userId })
            .sort({ isDefault: -1, updatedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: { addresses: list.map((a) => toResponse(a)) },
        });
    } catch (error) {
        console.error('listMyShippingAddresses:', error.message);
        return res.status(500).json({ message: 'Lỗi khi lấy danh sách địa chỉ', error: error.message });
    }
};

const validatePayload = (body) => {
    const {
        recipientName = '',
        shippingPhone = '',
        provinceCode = '',
        provinceName = '',
        districtCode = '',
        districtName = '',
        wardCode = '',
        wardName = '',
        addressLine = '',
        label = '',
    } = body || {};

    const rName = String(recipientName).trim();
    const phone = String(shippingPhone).trim().replace(/\s/g, '');
    const addr = String(addressLine).trim();

    if (!rName || rName.length < 2 || rName.length > 100) {
        return 'Tên người nhận phải từ 2–100 ký tự';
    }
    if (!/^[\p{L}\s.'-]+$/u.test(rName)) {
        return 'Tên người nhận chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
    }
    if (!/^0[2-9][0-9]{8,9}$/.test(phone)) {
        return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
    }
    if (!String(provinceCode).trim() || !String(provinceName).trim()) {
        return 'Vui lòng chọn Tỉnh/Thành phố';
    }
    if (!String(districtCode).trim() || !String(districtName).trim()) {
        return 'Vui lòng chọn Quận/Huyện';
    }
    if (!String(wardCode).trim() || !String(wardName).trim()) {
        return 'Vui lòng chọn Phường/Xã';
    }
    if (addr.length < 10 || addr.length > 200) {
        return 'Địa chỉ cụ thể phải từ 10–200 ký tự';
    }
    if (String(label).trim().length > 80) {
        return 'Nhãn địa chỉ không quá 80 ký tự';
    }
    return null;
};

export const createShippingAddress = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const err = validatePayload(req.body);
        if (err) return res.status(400).json({ message: err });

        const {
            recipientName,
            shippingPhone,
            provinceCode,
            provinceName,
            districtCode,
            districtName,
            wardCode,
            wardName,
            addressLine,
            label = '',
            isDefault = false,
        } = req.body;

        const phone = String(shippingPhone).trim().replace(/\s/g, '');

        const count = await ShippingAddress.countDocuments({ userId });
        let makeDefault = Boolean(isDefault);
        if (count === 0) makeDefault = true;

        const doc = await ShippingAddress.create({
            userId,
            label: String(label).trim(),
            recipientName: String(recipientName).trim(),
            shippingPhone: phone,
            provinceCode: String(provinceCode).trim(),
            provinceName: String(provinceName).trim(),
            districtCode: String(districtCode).trim(),
            districtName: String(districtName).trim(),
            wardCode: String(wardCode).trim(),
            wardName: String(wardName).trim(),
            addressLine: String(addressLine).trim(),
            isDefault: makeDefault,
        });

        if (makeDefault) {
            await unsetOtherDefaults(userId, doc._id);
        }

        const saved = await ShippingAddress.findById(doc._id).lean();

        return res.status(201).json({
            success: true,
            data: { address: toResponse(saved) },
        });
    } catch (error) {
        console.error('createShippingAddress:', error.message);
        return res.status(500).json({ message: 'Lỗi khi lưu địa chỉ', error: error.message });
    }
};

export const updateShippingAddress = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const err = validatePayload(req.body);
        if (err) return res.status(400).json({ message: err });

        const existing = await ShippingAddress.findOne({ _id: id, userId });
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        const {
            recipientName,
            shippingPhone,
            provinceCode,
            provinceName,
            districtCode,
            districtName,
            wardCode,
            wardName,
            addressLine,
            label = '',
            isDefault,
        } = req.body;

        const phone = String(shippingPhone).trim().replace(/\s/g, '');

        existing.label = String(label).trim();
        existing.recipientName = String(recipientName).trim();
        existing.shippingPhone = phone;
        existing.provinceCode = String(provinceCode).trim();
        existing.provinceName = String(provinceName).trim();
        existing.districtCode = String(districtCode).trim();
        existing.districtName = String(districtName).trim();
        existing.wardCode = String(wardCode).trim();
        existing.wardName = String(wardName).trim();
        existing.addressLine = String(addressLine).trim();

        if (typeof isDefault === 'boolean') {
            existing.isDefault = isDefault;
        }

        await existing.save();

        if (existing.isDefault) {
            await unsetOtherDefaults(userId, existing._id);
        }

        const saved = await ShippingAddress.findById(existing._id).lean();

        return res.status(200).json({
            success: true,
            data: { address: toResponse(saved) },
        });
    } catch (error) {
        console.error('updateShippingAddress:', error.message);
        return res.status(500).json({ message: 'Lỗi khi cập nhật địa chỉ', error: error.message });
    }
};

export const deleteShippingAddress = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const doc = await ShippingAddress.findOne({ _id: id, userId });
        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        const wasDefault = doc.isDefault;
        await doc.deleteOne();

        if (wasDefault) {
            const next = await ShippingAddress.findOne({ userId }).sort({ updatedAt: -1 });
            if (next) {
                next.isDefault = true;
                await next.save();
            }
        }

        return res.status(200).json({ success: true, message: 'Đã xóa địa chỉ' });
    } catch (error) {
        console.error('deleteShippingAddress:', error.message);
        return res.status(500).json({ message: 'Lỗi khi xóa địa chỉ', error: error.message });
    }
};

export const setDefaultShippingAddress = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'id không hợp lệ' });
        }

        const doc = await ShippingAddress.findOne({ _id: id, userId });
        if (!doc) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        doc.isDefault = true;
        await doc.save();
        await unsetOtherDefaults(userId, doc._id);

        const saved = await ShippingAddress.findById(doc._id).lean();

        return res.status(200).json({
            success: true,
            data: { address: toResponse(saved) },
        });
    } catch (error) {
        console.error('setDefaultShippingAddress:', error.message);
        return res.status(500).json({ message: 'Lỗi khi đặt địa chỉ mặc định', error: error.message });
    }
};
