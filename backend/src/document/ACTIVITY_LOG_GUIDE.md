# Activity Log System - Hướng dẫn sử dụng

## 📋 Tổng quan

Hệ thống Activity Log được thiết kế để theo dõi và ghi lại tất cả các hoạt động quan trọng trong hệ thống, đặc biệt là các thao tác liên quan đến quản lý quyền (RBAC).

## 🏗️ Cấu trúc

### 1. Model: `ActivityLog`

**Các trường chính:**
- `userId`: User thực hiện hành động
- `action`: Loại hành động (create, update, delete, login, assign_role, etc.)
- `resource`: Tài nguyên bị tác động (user, role, permission, etc.)
- `resourceId`: ID của tài nguyên
- `description`: Mô tả chi tiết
- `oldData`: Dữ liệu trước khi thay đổi
- `newData`: Dữ liệu sau khi thay đổi
- `ipAddress`: IP address của user
- `userAgent`: Thông tin browser/device
- `status`: Trạng thái (success, failed, error)
- `errorMessage`: Thông báo lỗi (nếu có)
- `metadata`: Dữ liệu bổ sung (JSON)

### 2. Utility Functions (`libs/activityLogger.js`)

#### `logActivity(options)`
Ghi log activity tổng quát.

```javascript
import { logActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

await logActivity({
    userId: user._id,
    action: 'update',
    resource: 'user',
    resourceId: targetUser._id,
    description: 'Cập nhật thông tin user',
    oldData: oldUserData,
    newData: newUserData,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    status: 'success',
});
```

#### `logRBACActivity(options)`
Ghi log cho các thao tác RBAC.

```javascript
import { logRBACActivity } from '../libs/activityLogger.js';

await logRBACActivity({
    userId: admin._id,
    action: 'assign_role',
    targetUserId: user._id,
    roleName: 'seller',
    description: 'Gán role seller cho user',
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    status: 'success',
});
```

#### `logAuthActivity(options)`
Ghi log cho các thao tác authentication.

```javascript
import { logAuthActivity } from '../libs/activityLogger.js';

await logAuthActivity({
    userId: user._id,
    action: 'login',
    description: 'User đăng nhập thành công',
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    status: 'success',
});
```

#### `logUserActivity(options)`
Ghi log cho các thao tác user management.

```javascript
import { logUserActivity } from '../libs/activityLogger.js';

await logUserActivity({
    userId: admin._id,
    action: 'update',
    targetUserId: user._id,
    description: 'Cập nhật thông tin user',
    oldData: oldUserData,
    newData: newUserData,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    status: 'success',
});
```

### 3. Middleware (`middlewares/activityLogger.js`)

Tự động ghi log cho các request.

```javascript
import { activityLogger } from '../middlewares/activityLogger.js';

// Sử dụng với options
router.put('/users/:id', authenticate, activityLogger({
    action: 'update',
    resource: 'user',
    logRequestBody: true,
    logResponseBody: false,
}), updateUser);
```

### 4. API Endpoints

#### GET `/api/activity-logs/me`
Lấy activity logs của user hiện tại (tất cả users).

#### GET `/api/activity-logs`
Lấy tất cả activity logs (chỉ admin).

**Query parameters:**
- `page`: Số trang (default: 1)
- `limit`: Số items mỗi trang (default: 20)
- `userId`: Lọc theo user ID
- `action`: Lọc theo action (create, update, delete, etc.)
- `resource`: Lọc theo resource
- `resourceId`: Lọc theo resource ID
- `status`: Lọc theo status (success, failed, error)
- `startDate`: Lọc từ ngày (ISO format)
- `endDate`: Lọc đến ngày (ISO format)
- `search`: Tìm kiếm trong description và resource

#### GET `/api/activity-logs/:id`
Lấy chi tiết một activity log.

#### DELETE `/api/activity-logs/:id`
Xóa activity log (chỉ admin).

## 🔧 Cách sử dụng trong Controller

### Ví dụ: Ghi log khi assign role

```javascript
import { logRBACActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const assignRoleToUser = async (req, res) => {
    try {
        const { userId, roleName } = req.body;
        const admin = req.user; // Admin thực hiện hành động

        // Thực hiện assign role
        await assignRoleByName(user, roleName);

        // Ghi log
        await logRBACActivity({
            userId: admin._id,
            action: 'assign_role',
            targetUserId: userId,
            roleName: roleName,
            description: `Admin ${admin.username} đã gán role ${roleName} cho user ${user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({ message: 'Đã gán role thành công' });
    } catch (error) {
        // Ghi log lỗi
        await logRBACActivity({
            userId: req.user._id,
            action: 'assign_role',
            targetUserId: req.body.userId,
            roleName: req.body.roleName,
            description: `Lỗi khi gán role`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'error',
            errorMessage: error.message,
        });

        res.status(500).json({ message: error.message });
    }
};
```

### Ví dụ: Ghi log khi update permission

```javascript
import { logRBACActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const updateRolePermissions = async (req, res) => {
    try {
        const { roleId, permissionIds } = req.body;
        const admin = req.user;

        // Lấy role cũ để so sánh
        const oldRole = await Role.findById(roleId).populate('permissions');

        // Cập nhật permissions
        const updatedRole = await Role.findByIdAndUpdate(
            roleId,
            { permissions: permissionIds },
            { new: true }
        ).populate('permissions');

        // Ghi log với oldData và newData
        await logRBACActivity({
            userId: admin._id,
            action: 'update_permission',
            targetUserId: null,
            roleName: updatedRole.name,
            description: `Admin ${admin.username} đã cập nhật permissions cho role ${updatedRole.name}`,
            oldData: {
                permissions: oldRole.permissions.map(p => p.name),
            },
            newData: {
                permissions: updatedRole.permissions.map(p => p.name),
            },
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({ role: updatedRole });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
```

## 📊 Frontend - Activity Log Page

Đã tạo component `ActivityLogPage` với các tính năng:
- Hiển thị danh sách logs với pagination
- Filters: action, resource, status, date range, search
- Badge màu sắc cho action và status
- Responsive table
- User có thể xem logs của mình, admin xem tất cả

## 🔐 Bảo mật

- Chỉ user authenticated mới có thể xem logs của mình
- Chỉ admin mới có thể xem tất cả logs và xóa logs
- IP address và user agent được ghi lại để audit

## 📈 Best Practices

1. **Luôn ghi log cho các thao tác quan trọng:**
   - RBAC operations (assign/revoke role, update permissions)
   - User management (create, update, delete user)
   - Authentication (login, logout, register)
   - Data modifications (create, update, delete)

2. **Ghi log cả success và error:**
   - Ghi log khi thành công để audit trail
   - Ghi log khi lỗi để debug và security monitoring

3. **Không ghi log cho sensitive data:**
   - Không log password, token, credit card numbers
   - Chỉ log metadata, không log toàn bộ sensitive objects

4. **Sử dụng oldData và newData cho update operations:**
   - Giúp track changes và có thể rollback nếu cần

5. **Indexes đã được tạo:**
   - `userId + createdAt`: Tối ưu query logs của user
   - `resource + resourceId`: Tối ưu query logs của resource
   - `action + createdAt`: Tối ưu query theo action
   - `createdAt`: Tối ưu query theo thời gian

## 🚀 Mở rộng

Có thể mở rộng thêm:
- Export logs ra file (CSV, Excel)
- Real-time notifications cho admin
- Log retention policy (xóa logs cũ sau X ngày)
- Log aggregation và analytics
- Alert system cho suspicious activities

