import UsageDevice from '../models/UsageDevice.js';
import Product from '../models/Product.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const getAllUsageDevices = async (req, res) => {
    try {
        const devices = await UsageDevice.find({}).sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: { usageDevices: devices },
        });
    } catch (error) {
        console.error('getAllUsageDevices error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách thiết bị sử dụng', error: error.message });
    }
};

export const getUsageDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await UsageDevice.findById(id);
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị sử dụng' });
        }
        res.status(200).json({
            success: true,
            data: { usageDevice: device },
        });
    } catch (error) {
        console.error('getUsageDeviceById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin thiết bị sử dụng', error: error.message });
    }
};

export const createUsageDevice = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên thiết bị sử dụng là bắt buộc' });
        }
        const normalizedName = name.trim();
        const existing = await UsageDevice.findOne({ name: normalizedName });
        if (existing) {
            return res.status(400).json({ message: 'Thiết bị sử dụng đã tồn tại' });
        }
        const device = await UsageDevice.create({
            name: normalizedName,
            description: description?.trim() || '',
        });
        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'usageDevice',
            resourceId: device._id,
            description: `Tạo thiết bị sử dụng: ${device.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });
        res.status(201).json({
            success: true,
            message: 'Tạo thiết bị sử dụng thành công',
            data: { usageDevice: device },
        });
    } catch (error) {
        console.error('createUsageDevice error:', error.message);
        await logAuthActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'usageDevice',
            description: `Tạo thiết bị sử dụng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Thiết bị sử dụng đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo thiết bị sử dụng', error: error.message });
    }
};

export const updateUsageDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const device = await UsageDevice.findById(id);
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị sử dụng' });
        }
        const oldData = { name: device.name, description: device.description };
        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Tên thiết bị sử dụng không được để trống' });
            }
            const normalizedName = name.trim();
            const existing = await UsageDevice.findOne({ name: normalizedName, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Tên thiết bị sử dụng đã tồn tại' });
            }
            device.name = normalizedName;
        }
        if (description !== undefined) {
            device.description = description?.trim() || '';
        }
        await device.save();
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'usageDevice',
            resourceId: device._id,
            description: `Cập nhật thiết bị sử dụng: ${device.name}`,
            oldData,
            newData: { name: device.name, description: device.description },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });
        res.status(200).json({
            success: true,
            message: 'Cập nhật thiết bị sử dụng thành công',
            data: { usageDevice: device },
        });
    } catch (error) {
        console.error('updateUsageDevice error:', error.message);
        await logAuthActivity({
            userId: req.user?._id,
            action: 'update',
            resource: 'usageDevice',
            resourceId: req.params.id,
            description: `Cập nhật thiết bị sử dụng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên thiết bị sử dụng đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật thiết bị sử dụng', error: error.message });
    }
};

export const deleteUsageDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await UsageDevice.findById(id);
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị sử dụng' });
        }
        // Sản phẩm tham chiếu bằng ObjectId usageDevice
        const productCount = await Product.countDocuments({ usageDevice: device._id });
        if (productCount > 0) {
            return res.status(400).json({
                message: `Không thể xóa thiết bị sử dụng này vì có ${productCount} sản phẩm đang sử dụng`,
            });
        }
        await UsageDevice.findByIdAndDelete(id);
        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'usageDevice',
            resourceId: id,
            description: `Xóa thiết bị sử dụng: ${device.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });
        res.status(200).json({
            success: true,
            message: 'Xóa thiết bị sử dụng thành công',
        });
    } catch (error) {
        console.error('deleteUsageDevice error:', error.message);
        await logAuthActivity({
            userId: req.user?._id,
            action: 'delete',
            resource: 'usageDevice',
            resourceId: req.params.id,
            description: `Xóa thiết bị sử dụng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });
        res.status(500).json({ message: 'Lỗi khi xóa thiết bị sử dụng', error: error.message });
    }
};

