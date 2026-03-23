import Role from '../models/Role.js';

// Lấy danh sách roles (RBAC theo vai trò)
export const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find({})
            .select('name description')
            .sort({ name: 1 });
        res.status(200).json({ success: true, data: { roles } });
    } catch (error) {
        console.error('getAllRoles error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách vai trò', error: error.message });
    }
};

// Lấy chi tiết 1 role
export const getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id).select('name description');
        if (!role) {
            return res.status(404).json({ message: 'Không tìm thấy vai trò' });
        }
        res.status(200).json({ success: true, data: { role } });
    } catch (error) {
        console.error('getRoleById error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin vai trò', error: error.message });
    }
};

// Tạo role mới
export const createRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên vai trò là bắt buộc' });
        }
        const existing = await Role.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Vai trò đã tồn tại' });
        }
        const role = await Role.create({
            name: name.trim(),
            description: description?.trim() || '',
        });
        res.status(201).json({
            success: true,
            message: 'Tạo vai trò thành công',
            data: { role },
        });
    } catch (error) {
        console.error('createRole error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo vai trò', error: error.message });
    }
};

// Cập nhật role
export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Không tìm thấy vai trò' });
        }

        const isAdminRole = role.name === 'admin';

        if (name !== undefined) {
            if (isAdminRole && name.trim() !== role.name) {
                return res.status(400).json({ message: 'Không được đổi tên vai trò quản trị viên' });
            }
            const trimmed = name.trim();
            if (!trimmed) {
                return res.status(400).json({ message: 'Tên vai trò không được để trống' });
            }
            const existing = await Role.findOne({ name: trimmed, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Tên vai trò đã tồn tại' });
            }
            role.name = trimmed;
        }

        if (description !== undefined) {
            role.description = description?.trim() || '';
        }

        await role.save();
        res.status(200).json({
            success: true,
            message: 'Cập nhật vai trò thành công',
            data: { role },
        });
    } catch (error) {
        console.error('updateRole error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật vai trò', error: error.message });
    }
};

// Xóa role
export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Không tìm thấy vai trò' });
        }
        if (role.name === 'admin') {
            return res.status(400).json({ message: 'Không được xóa vai trò quản trị viên' });
        }
        await Role.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Xóa vai trò thành công' });
    } catch (error) {
        console.error('deleteRole error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa vai trò', error: error.message });
    }
};

