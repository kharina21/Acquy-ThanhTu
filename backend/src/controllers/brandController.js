import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const getAllBrands = async (req, res) => {
    try {
        const brands = await Brand.find({}).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: { brands },
        });
    } catch (error) {
        console.error('getAllBrands error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách thương hiệu', error: error.message });
    }
};

export const getBrandById = async (req, res) => {
    try {
        const { id } = req.params;
        const brand = await Brand.findById(id);

        if (!brand) {
            return res.status(404).json({ message: 'Không tìm thấy thương hiệu' });
        }

        res.status(200).json({
            success: true,
            data: { brand },
        });
    } catch (error) {
        console.error('getBrandById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin thương hiệu', error: error.message });
    }
};

export const createBrand = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên thương hiệu là bắt buộc' });
        }

        const normalizedName = name.trim();
        const existing = await Brand.findOne({ name: normalizedName });
        if (existing) {
            return res.status(400).json({ message: 'Thương hiệu đã tồn tại' });
        }

        const brand = await Brand.create({
            name: normalizedName,
            description: description?.trim() || '',
        });

        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'brand',
            resourceId: brand._id,
            description: `Tạo thương hiệu: ${brand.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({
            success: true,
            message: 'Tạo thương hiệu thành công',
            data: { brand },
        });
    } catch (error) {
        console.error('createBrand error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'brand',
            description: `Tạo thương hiệu thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Thương hiệu đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo thương hiệu', error: error.message });
    }
};

export const updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({ message: 'Không tìm thấy thương hiệu' });
        }

        const oldData = { name: brand.name, description: brand.description };

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Tên thương hiệu không được để trống' });
            }
            const normalizedName = name.trim();
            const existing = await Brand.findOne({ name: normalizedName, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Tên thương hiệu đã tồn tại' });
            }
            brand.name = normalizedName;
        }

        if (description !== undefined) {
            brand.description = description?.trim() || '';
        }

        await brand.save();

        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'brand',
            resourceId: brand._id,
            description: `Cập nhật thương hiệu: ${brand.name}`,
            oldData,
            newData: { name: brand.name, description: brand.description },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật thương hiệu thành công',
            data: { brand },
        });
    } catch (error) {
        console.error('updateBrand error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'update',
            resource: 'brand',
            resourceId: req.params.id,
            description: `Cập nhật thương hiệu thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên thương hiệu đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật thương hiệu', error: error.message });
    }
};

export const deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;

        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({ message: 'Không tìm thấy thương hiệu' });
        }

        // Nếu đã migrate sang reference, kiểm tra Product.brand ref; nếu chưa thì fallback brandName
        const productCount = await Product.countDocuments({
            $or: [{ brand: brand._id }, { brandName: brand.name }],
        });

        if (productCount > 0) {
            return res.status(400).json({
                message: `Không thể xóa thương hiệu này vì có ${productCount} sản phẩm đang sử dụng`,
            });
        }

        await Brand.findByIdAndDelete(id);

        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'brand',
            resourceId: id,
            description: `Xóa thương hiệu: ${brand.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Xóa thương hiệu thành công',
        });
    } catch (error) {
        console.error('deleteBrand error:', error.message);

        await logAuthActivity({
            userId: req.user?._id,
            action: 'delete',
            resource: 'brand',
            resourceId: req.params.id,
            description: `Xóa thương hiệu thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi xóa thương hiệu', error: error.message });
    }
};


