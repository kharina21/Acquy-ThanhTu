import User from '../models/User.js';
import Role from '../models/Role.js';
import bcrypt from 'bcryptjs';
import { assignRoleByName, removeRoleByName } from '../libs/rbacHelpers.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const roleFilter = req.query.role || '';
        const kindFilter = req.query.kind || ''; // 'staff' | 'customer' | ''
        const isVerifiedFilter = req.query.isVerified;
        const statusFilter = req.query.status || '';
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};

        // Filter by role (cụ thể)
        if (roleFilter) {
            const role = await Role.findOne({ name: roleFilter });
            if (role) {
                query.roles = role._id;
            }
        } else if (kindFilter) {
            // Lọc theo loại tài khoản (staff / customer) khi không chọn role cụ thể
            if (kindFilter === 'staff') {
                const staffRoleNames = ['seller', 'warehouse_manager', 'manager', 'staff'];
                const staffRoles = await Role.find({ name: { $in: staffRoleNames } }).select('_id');
                const ids = staffRoles.map((r) => r._id);
                if (ids.length) {
                    query.roles = { $in: ids };
                } else {
                    // Nếu chưa seed roles, trả rỗng
                    query.roles = { $in: [] };
                }
            } else if (kindFilter === 'customer') {
                const userRole = await Role.findOne({ name: 'user' }).select('_id');
                if (userRole) {
                    query.roles = userRole._id;
                } else {
                    query.roles = { $in: [] };
                }
            }
        }

        if (isVerifiedFilter !== undefined && isVerifiedFilter !== '') {
            query.isVerified = isVerifiedFilter === 'true';
        }

        if (statusFilter) {
            query.status = statusFilter;
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
                query.createdAt.$gte = fromDate;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                query.createdAt.$lte = toDate;
            }
        }

        // Search by username, email, firstName, lastName
        // MongoDB automatically combines $or with other fields using AND logic
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }

        // Get users with pagination
        const users = await User.find(query)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count
        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.log('Lỗi khi lấy danh sách users: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách users', error: error.message });
    }
};

// Lấy thông tin chi tiết một user
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        console.log('Lỗi khi lấy thông tin user: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin user', error: error.message });
    }
};

// Tạo user mới (chỉ admin/owner)
export const createUser = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, phoneNumber, address, roles, isVerified, status } = req.body;

        // Kiểm tra username đã tồn tại
        const existingUser = await User.findOne({ username }).select('-password');
        if (existingUser) {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        // Kiểm tra phoneNumber (nếu có) đã tồn tại
        if (phoneNumber) {
            const existingPhone = await User.findOne({ phoneNumber });
            if (existingPhone) {
                return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi người dùng khác' });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user
        const user = await User.create({
            username,
            password: hashedPassword,
            email,
            firstName,
            lastName,
            phoneNumber: phoneNumber || '',
            address: address || '',
            isVerified: isVerified !== undefined ? isVerified : true, // Admin tạo user thì mặc định verified
            status: status || 'active',
        });

        // Gán 1 vai trò nếu có (mỗi user chỉ 1 role; không cho gán admin)
        if (roles && Array.isArray(roles) && roles.length > 0) {
            const roleName = roles[0];
            if (roleName === 'admin') {
                return res.status(403).json({ message: 'Không được gán vai trò quản trị viên khi tạo user' });
            }
            await assignRoleByName(user, roleName);
        } else {
            // Nếu không có role, gán role mặc định
            const { assignDefaultRole } = await import('../libs/rbacHelpers.js');
            await assignDefaultRole(user);
        }

        // Lấy lại user với roles đã populate
        const userWithRoles = await User.findById(user._id)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            });

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'user',
            description: `Admin ${req.user.username} đã tạo user mới: ${username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({
            success: true,
            message: 'Tạo user thành công',
            data: { user: userWithRoles },
        });
    } catch (error) {
        console.log('Lỗi khi tạo user: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'user',
            description: `Tạo user thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi tạo user', error: error.message });
    }
};

// Cập nhật thông tin user
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phoneNumber, address, status, isVerified } = req.body;

        // Kiểm tra user có tồn tại không
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Kiểm tra email có bị trùng với user khác không
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email đã được sử dụng bởi người dùng khác' });
            }
        }

        // Kiểm tra phoneNumber có bị trùng với user khác không
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const existingPhone = await User.findOne({ phoneNumber, _id: { $ne: id } });
            if (existingPhone) {
                return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi người dùng khác' });
            }
        }

        // Cập nhật thông tin
        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (email !== undefined) {
            updateData.email = email;
            // Nếu email thay đổi và isVerified không được gửi lên, set isVerified = false
            if (email !== user.email && isVerified === undefined) {
                updateData.isVerified = false;
            }
        }
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (address !== undefined) updateData.address = address;
        if (status !== undefined) {
            // Validate status
            const validStatuses = ['active', 'inactive', 'banned', 'suspended'];
            if (validStatuses.includes(status)) {
                updateData.status = status;
            } else {
                return res.status(400).json({ message: 'Status không hợp lệ' });
            }
        }
        if (isVerified !== undefined) {
            updateData.isVerified = isVerified;
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            });

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'user',
            description: `Admin ${req.user.username} đã cập nhật thông tin user: ${updatedUser.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin user thành công',
            data: { user: updatedUser },
        });
    } catch (error) {
        console.log('Lỗi khi cập nhật user: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'user',
            description: `Cập nhật user thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi cập nhật user', error: error.message });
    }
};

// Kiểm tra user có vai trò admin hay không (roles là mảng ObjectId)
const userHasAdminRole = async (user) => {
    if (!user?.roles?.length) return false;
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) return false;
    return user.roles.some((rid) => rid.toString() === adminRole._id.toString());
};

// Xóa user (soft delete - không thực sự xóa)
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Không cho phép xóa chính mình
        if (id === req.user._id.toString()) {
            return res.status(400).json({ message: 'Không thể xóa chính tài khoản của bạn' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Không cho phép xóa tài khoản quản trị viên (admin)
        if (await userHasAdminRole(user)) {
            return res.status(403).json({ message: 'Không được xóa tài khoản quản trị viên' });
        }

        // Xóa user
        await User.findByIdAndDelete(id);

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'user',
            description: `Admin ${req.user.username} đã xóa user: ${user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Xóa user thành công',
        });
    } catch (error) {
        console.log('Lỗi khi xóa user: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'user',
            description: `Xóa user thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi xóa user', error: error.message });
    }
};

// Gán role cho user (mỗi user chỉ 1 vai trò)
export const assignRoles = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles } = req.body; // Mảng role names, chỉ dùng phần tử đầu

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ message: 'Vui lòng chọn một vai trò' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Không cho phép sửa quyền tài khoản quản trị viên
        if (await userHasAdminRole(user)) {
            return res.status(403).json({ message: 'Không được sửa đổi quyền tài khoản quản trị viên' });
        }

        const roleName = roles[0];
        if (roleName === 'admin') {
            return res.status(403).json({ message: 'Không được gán vai trò quản trị viên' });
        }

        // Manager chỉ được gán seller hoặc warehouse_manager (không gán manager)
        const currentUser = await User.findById(req.user._id).populate('roles', 'name');
        const currentRoleNames = (currentUser?.roles || []).map((r) => r.name);
        const isAdmin = currentRoleNames.includes('admin');
        if (!isAdmin && currentRoleNames.includes('manager')) {
            const managerAllowedRoles = ['seller', 'warehouse_manager'];
            if (!managerAllowedRoles.includes(roleName)) {
                return res.status(403).json({
                    message: 'Quản lý chỉ được gán vai trò Nhân viên bán hàng hoặc Quản lý kho',
                });
            }
        }

        const role = await Role.findOne({ name: roleName });
        if (!role) {
            return res.status(400).json({ message: 'Vai trò không tồn tại' });
        }

        // Mỗi user chỉ 1 role: ghi đè thành [roleId]
        user.roles = [role._id];
        await user.save();

        // Lấy lại user với roles đã populate
        const userWithRoles = await User.findById(id)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            });

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'assign_role',
            resource: 'user',
            description: `Admin ${req.user.username} đã gán vai trò ${roleName} cho user: ${user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật vai trò thành công',
            data: { user: userWithRoles },
        });
    } catch (error) {
        console.log('Lỗi khi gán role: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'assign_role',
            resource: 'user',
            description: `Gán roles thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi gán roles', error: error.message });
    }
};

// Xóa roles khỏi user
export const removeRoles = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles } = req.body; // Array of role names

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ message: 'Vui lòng cung cấp danh sách roles' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Không cho phép sửa quyền tài khoản quản trị viên
        if (await userHasAdminRole(user)) {
            return res.status(403).json({ message: 'Không được sửa đổi quyền tài khoản quản trị viên' });
        }

        // Xóa roles
        const removedRoles = [];
        for (const roleName of roles) {
            await removeRoleByName(user, roleName);
            removedRoles.push(roleName);
        }

        // Lấy lại user với roles đã populate
        const userWithRoles = await User.findById(id)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name description',
            });

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'revoke_role',
            resource: 'user',
            description: `Admin ${req.user.username} đã xóa roles [${roles.join(', ')}] khỏi user: ${user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Xóa roles thành công',
            data: { user: userWithRoles },
        });
    } catch (error) {
        console.log('Lỗi khi xóa roles: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'revoke_role',
            resource: 'user',
            description: `Xóa roles thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi xóa roles', error: error.message });
    }
};

// Đặt lại mật khẩu cho user (admin/owner)
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu
        await User.findByIdAndUpdate(id, { password: hashedPassword });

        // Log activity
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'user',
            description: `Admin ${req.user.username} đã đặt lại mật khẩu cho user: ${user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Đặt lại mật khẩu thành công',
        });
    } catch (error) {
        console.log('Lỗi khi đặt lại mật khẩu: ' + error.message);

        // Log failed
        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'user',
            description: `Đặt lại mật khẩu thất bại`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu', error: error.message });
    }
};

// Lấy danh sách tất cả roles
export const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.find({ isActive: true }).select('name description').sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: { roles },
        });
    } catch (error) {
        console.log('Lỗi khi lấy danh sách roles: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách roles', error: error.message });
    }
};

