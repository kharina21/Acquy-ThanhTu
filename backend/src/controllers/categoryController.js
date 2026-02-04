import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: { categories },
        });
    } catch (error) {
        console.error('getAllCategories error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách loại hàng', error: error.message });
    }
};


export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy loại hàng' });
        }

        res.status(200).json({
            success: true,
            data: { category },
        });
    } catch (error) {
        console.error('getCategoryById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin loại hàng', error: error.message });
    }
};

/**
 * Tạo category mới
 */
export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên loại hàng là bắt buộc' });
        }

        // Kiểm tra category đã tồn tại chưa
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(400).json({ message: 'Loại hàng đã tồn tại' });
        }

        const category = new Category({
            name: name.trim(),
            description: description?.trim() || '',
        });

        await category.save();

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'category',
            resourceId: category._id,
            description: `Tạo loại hàng: ${category.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({
            success: true,
            message: 'Tạo loại hàng thành công',
            data: { category },
        });
    } catch (error) {
        console.error('createCategory error:', error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'category',
            description: `Tạo loại hàng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Loại hàng đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo loại hàng', error: error.message });
    }
};

/**
 * Cập nhật category
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy loại hàng' });
        }

        const oldData = { name: category.name, description: category.description };

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Tên loại hàng không được để trống' });
            }
            // Kiểm tra nếu tên mới trùng với category khác
            const existingCategory = await Category.findOne({ name: name.trim(), _id: { $ne: id } });
            if (existingCategory) {
                return res.status(400).json({ message: 'Tên loại hàng đã tồn tại' });
            }
            category.name = name.trim();
        }

        if (description !== undefined) {
            category.description = description?.trim() || '';
        }

        await category.save();

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'category',
            resourceId: category._id,
            description: `Cập nhật loại hàng: ${category.name}`,
            oldData,
            newData: { name: category.name, description: category.description },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật loại hàng thành công',
            data: { category },
        });
    } catch (error) {
        console.error('updateCategory error:', error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user?._id,
            action: 'update',
            resource: 'category',
            resourceId: req.params.id,
            description: `Cập nhật loại hàng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên loại hàng đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi cập nhật loại hàng', error: error.message });
    }
};

/**
 * Xóa category
 */
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy loại hàng' });
        }

        // Kiểm tra xem có sản phẩm nào đang sử dụng category này không (chỉ tính sản phẩm chưa xóa)
        // Product.category là ObjectId reference, không phải string
        const productCount = await Product.countDocuments({ category: id, isDeleted: false });
        if (productCount > 0) {
            return res.status(400).json({
                message: `Không thể xóa loại hàng này vì có ${productCount} sản phẩm đang sử dụng`,
            });
        }

        await Category.findByIdAndDelete(id);

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'category',
            resourceId: id,
            description: `Xóa loại hàng: ${category.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Xóa loại hàng thành công',
        });
    } catch (error) {
        console.error('deleteCategory error:', error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user?._id,
            action: 'delete',
            resource: 'category',
            resourceId: req.params.id,
            description: `Xóa loại hàng thất bại: ${error.message}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi xóa loại hàng', error: error.message });
    }
};

