import Role from '../models/Role.js';
import Permission from '../models/Permission.js';

// Lấy danh sách roles cùng permissions
export const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find({})
            .populate('permissions', 'name description resource action')
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
        const role = await Role.findById(req.params.id).populate(
            'permissions',
            'name description resource action'
        );
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
        const { name, description, permissionIds } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên vai trò là bắt buộc' });
        }
        const existing = await Role.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Vai trò đã tồn tại' });
        }
        const validPermissionIds = Array.isArray(permissionIds)
            ? permissionIds.filter((id) => id && typeof id === 'string')
            : [];
        const role = await Role.create({
            name: name.trim(),
            description: description?.trim() || '',
            permissions: validPermissionIds,
        });
        const populated = await Role.findById(role._id).populate(
            'permissions',
            'name description resource action'
        );
        res.status(201).json({
            success: true,
            message: 'Tạo vai trò thành công',
            data: { role: populated },
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
        const { name, description, permissionIds, isActive } = req.body;

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Không tìm thấy vai trò' });
        }

        // Không cho sửa tên hoặc tắt role admin
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

        if (Array.isArray(permissionIds)) {
            if (isAdminRole) {
                return res.status(400).json({ message: 'Không được sửa permissions của vai trò quản trị viên' });
            }
            role.permissions = permissionIds.filter((id) => id && typeof id === 'string');
        }

        if (isActive !== undefined) {
            if (isAdminRole && isActive === false) {
                return res.status(400).json({ message: 'Không được vô hiệu hóa vai trò quản trị viên' });
            }
            role.isActive = !!isActive;
        }

        await role.save();
        const populated = await Role.findById(id).populate(
            'permissions',
            'name description resource action'
        );
        res.status(200).json({
            success: true,
            message: 'Cập nhật vai trò thành công',
            data: { role: populated },
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

// Lấy danh sách tất cả permissions
export const getAllPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find({})
            .select('name description resource action')
            .sort({ resource: 1, action: 1 });
        res.status(200).json({ success: true, data: { permissions } });
    } catch (error) {
        console.error('getAllPermissions error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách permissions', error: error.message });
    }
};

