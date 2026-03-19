import Location from '../models/Location.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

/**
 * Chi nhánh nhận đơn online – chỉ một. Fallback: chi nhánh đầu tiên đang hoạt động.
 */
export const getOnlineLocation = async () => {
    let loc = await Location.findOne({ isOnlineLocation: true, isActive: true }).lean();
    if (!loc) loc = await Location.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
    return loc;
};

/**
 * GET /api/locations/online – Chi nhánh được đặt làm bán online (cho UI).
 * Trả về null nếu chưa chọn; backend vẫn dùng fallback khi tạo đơn.
 */
export const getOnlineLocationHandler = async (req, res) => {
    try {
        const location = await Location.findOne({ isOnlineLocation: true, isActive: true }).lean();
        res.status(200).json({
            success: true,
            data: { location: location || null },
        });
    } catch (error) {
        console.error('getOnlineLocation error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi nhánh bán online', error: error.message });
    }
};

/**
 * PUT /api/locations/:id/set-online – Đặt chi nhánh này làm bán online (chỉ admin/manager).
 */
export const setOnlineLocation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'Thiếu ID chi nhánh' });

        const location = await Location.findById(id);
        if (!location) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
        if (!location.isActive) return res.status(400).json({ message: 'Chi nhánh đang tạm ngưng, không thể đặt làm bán online' });

        await Location.updateMany({ _id: { $ne: id } }, { isOnlineLocation: false });
        location.isOnlineLocation = true;
        await location.save();

        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'location',
            resourceId: location._id,
            description: `Đặt chi nhánh bán online: ${location.name} (${location.code})`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: `Đã đặt "${location.name}" làm chi nhánh nhận đơn online`,
            data: { location },
        });
    } catch (error) {
        console.error('setOnlineLocation error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật', error: error.message });
    }
};

/**
 * GET /api/locations/active – Danh sách chi nhánh đang hoạt động.
 * Dành cho user checkout (chỉ cần authenticate, không cần admin/manager).
 */
export const getActiveLocations = async (req, res) => {
    try {
        const locations = await Location.find({ isActive: true }).sort({ code: 1 }).lean();
        res.status(200).json({
            success: true,
            data: { locations },
        });
    } catch (error) {
        console.error('getActiveLocations error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách chi nhánh', error: error.message });
    }
};

export const getAllLocations = async (req, res) => {
    try {
        const { isActive } = req.query;
        const filter = {};
        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }
        const locations = await Location.find(filter).sort({ code: 1 });

        res.status(200).json({
            success: true,
            data: { locations },
        });
    } catch (error) {
        console.error('getAllLocations error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách chi nhánh', error: error.message });
    }
};

export const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await Location.findById(id);

        if (!location) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
        }

        res.status(200).json({
            success: true,
            data: { location },
        });
    } catch (error) {
        console.error('getLocationById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin chi nhánh', error: error.message });
    }
};

export const createLocation = async (req, res) => {
    try {
        const { code, name, address, phone, isActive, note } = req.body;

        if (!code || !code.trim()) {
            return res.status(400).json({ message: 'Mã chi nhánh là bắt buộc' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên chi nhánh là bắt buộc' });
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await Location.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(400).json({ message: 'Mã chi nhánh đã tồn tại' });
        }

        const location = await Location.create({
            code: normalizedCode,
            name: name.trim(),
            address: address?.trim() || '',
            phone: phone?.trim() || '',
            isActive: isActive !== false,
            note: note?.trim() || '',
        });

        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'location',
            resourceId: location._id,
            description: `Tạo chi nhánh: ${location.name} (${location.code})`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({
            success: true,
            message: 'Tạo chi nhánh thành công',
            data: { location },
        });
    } catch (error) {
        console.error('createLocation error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'location',
            description: `Tạo chi nhánh thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã chi nhánh đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo chi nhánh', error: error.message });
    }
};

export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, address, phone, isActive, note } = req.body;

        const location = await Location.findById(id);
        if (!location) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
        }

        const oldData = { code: location.code, name: location.name, address: location.address, phone: location.phone, isActive: location.isActive, note: location.note };

        if (code !== undefined && code.trim()) {
            const normalizedCode = code.trim().toUpperCase();
            const existing = await Location.findOne({ code: normalizedCode, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Mã chi nhánh đã tồn tại' });
            }
            location.code = normalizedCode;
        }
        if (name !== undefined && name.trim()) location.name = name.trim();
        if (address !== undefined) location.address = address?.trim() || '';
        if (phone !== undefined) location.phone = phone?.trim() || '';
        if (typeof isActive === 'boolean') location.isActive = isActive;
        if (note !== undefined) location.note = note?.trim() || '';

        await location.save();

        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'location',
            resourceId: location._id,
            description: `Cập nhật chi nhánh: ${location.name} (${location.code})`,
            oldData,
            newData: { code: location.code, name: location.name, address: location.address, phone: location.phone, isActive: location.isActive, note: location.note },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật chi nhánh thành công',
            data: { location },
        });
    } catch (error) {
        console.error('updateLocation error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'update',
            resource: 'location',
            resourceId: req.params.id,
            description: `Cập nhật chi nhánh thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã chi nhánh đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật chi nhánh', error: error.message });
    }
};

export const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;

        const location = await Location.findById(id);
        if (!location) {
            return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
        }

        const totalLocations = await Location.countDocuments();
        if (totalLocations <= 1) {
            return res.status(400).json({
                message: 'Cần có ít nhất một chi nhánh trong hệ thống. Không thể xóa chi nhánh cuối cùng.',
            });
        }

        await Location.findByIdAndDelete(id);

        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'location',
            resourceId: id,
            description: `Xóa chi nhánh: ${location.name} (${location.code})`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Xóa chi nhánh thành công',
        });
    } catch (error) {
        console.error('deleteLocation error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'delete',
            resource: 'location',
            resourceId: req.params.id,
            description: `Xóa chi nhánh thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi xóa chi nhánh', error: error.message });
    }
};
