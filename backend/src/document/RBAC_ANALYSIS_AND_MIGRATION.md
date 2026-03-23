# Phân tích RBAC và Đề xuất Chuyển sang Phân quyền thật sự

## 1. Tổng quan hiện trạng

### 1.1 Kiến trúc đã có (Models)

| Thành phần     | Mô tả                                                        | Trạng thái       |
| -------------- | ------------------------------------------------------------ | ---------------- |
| **Permission** | `resource` + `action` (create, read, update, delete, manage) | ✅ Đã có, đầy đủ |
| **Role**       | `name` + `permissions[]` (ref Permission)                    | ✅ Đã có         |
| **User**       | `roles[]` (ref Role)                                         | ✅ Đã có         |

### 1.2 Middleware đã có

| Middleware                        | Mô tả                                             | Sử dụng thực tế               |
| --------------------------------- | ------------------------------------------------- | ----------------------------- |
| `hasRole(...roleNames)`           | Kiểm tra user có role theo **tên**                | ✅ **Dùng ở TẤT CẢ routes**   |
| `hasPermission(resource, action)` | Kiểm tra user có quyền theo **resource + action** | ❌ **KHÔNG dùng ở route nào** |

### 1.3 Vấn đề chính

1. **Backend routes**: 100% dùng `hasRole`, 0% dùng `hasPermission`
    - Phân quyền dựa trên **tên role** (admin, manager, seller, staff, warehouse_manager)
    - **Permission** (resource + action) đã được seed nhưng **không được kiểm tra** khi gọi API

2. **Không đồng bộ tên role**
    - **seedRBAC** tạo: `Người dùng thường`, `Nhân viên bán hàng`, `Quản lý kho`, `Quản lý chi nhánh`, `admin`
    - **Routes/Client** kỳ vọng: `admin`, `manager`, `warehouse_manager`, `seller`, `staff`
    - Một số route dùng cả hai: `hasRole('admin', 'manager', 'Quản lý chi nhánh')` → lộn xộn

3. **Client**
    - `useUserRole`: kiểm tra role name (admin, manager, seller, staff, warehouse_manager)
    - `usePermissions`: kiểm tra permission (resource:action) – **AdminSidebar dùng** – nhưng route protection vẫn dùng role
    - `RoleProtectedRoute`: dùng `allowedRoles` (tên role)

---

## 2. Bảng ánh xạ Role ↔ Permission (từ seedRBAC)

| Role (seedRBAC)    | Permissions                                                              | Tương đương route kỳ vọng |
| ------------------ | ------------------------------------------------------------------------ | ------------------------- |
| Người dùng thường  | user:read, product:read, order:create, order:read                        | (customer)                |
| Nhân viên bán hàng | user:read, product:read, order:\*, stock_check:read                      | **seller** / **staff**    |
| Quản lý kho        | user:read, product:read/update, order:read, stock_check:\*               | **warehouse_manager**     |
| Quản lý chi nhánh  | user:read/update, product:_, order:_, stock_check:read/update, role:read | **manager**               |
| admin              | Tất cả                                                                   | **admin**                 |

---

## 3. Đề xuất Migration: Chuyển sang RBAC thật (Permission-based)

### Bước 1: Chuẩn hóa tên Role (seedRBAC)

Thêm **alias** hoặc đổi tên role để đồng bộ với code:

**Cách A – Giữ tên tiếng Việt, thêm code/alias:**

```javascript
// Role schema thêm: code: { type: String, unique: true }
// Ví dụ: name: "Nhân viên bán hàng", code: "seller"
```

**Cách B – Dùng tên tiếng Anh (khuyến nghị):**

```javascript
// seedRBAC – đổi tên role
{ name: 'seller', description: 'Nhân viên bán hàng', permissions: [...] },
{ name: 'warehouse_manager', description: 'Quản lý kho', permissions: [...] },
{ name: 'manager', description: 'Quản lý chi nhánh', permissions: [...] },
{ name: 'customer', description: 'Người dùng thường', permissions: [...] },
{ name: 'admin', description: 'Quản trị viên', permissions: [...] },
```

### Bước 2: Bổ sung Permission còn thiếu

Cần thêm permission cho các resource đang dùng trong routes:

| Resource                      | Actions cần                          | Ghi chú                 |
| ----------------------------- | ------------------------------------ | ----------------------- |
| user                          | create, read, update, delete, manage | ✅ Đã có                |
| product                       | create, read, update, delete, manage | ✅ Đã có                |
| order                         | create, read, update, delete, manage | ✅ Đã có                |
| role                          | create, read, update, delete, manage | ✅ Đã có                |
| stock_check                   | create, read, update, delete, manage | ✅ Đã có                |
| **location**                  | read, update, manage                 | ❌ Cần thêm             |
| **supplier**                  | create, read, update, delete         | ❌ Cần thêm             |
| **brand**                     | create, read, update, delete         | ❌ Cần thêm             |
| **category**                  | create, read, update, delete         | ❌ Cần thêm             |
| **member_policy**             | create, read, update, delete         | ❌ Cần thêm             |
| **bank_account**              | create, read, update, delete         | ❌ Cần thêm             |
| **activity_log**              | read, delete                         | ❌ Cần thêm (chỉ admin) |
| **dashboard**                 | read                                 | ❌ Cần thêm             |
| **usage_device**              | create, read, update, delete         | ❌ Cần thêm             |
| **customer** (Customer model) | create, read, update, delete         | ❌ Cần thêm             |
| **employee**                  | create, read, update, delete         | ❌ Cần thêm             |
| **stock_in**                  | create, read                         | ❌ Cần thêm             |
| **stock_return**              | create, read                         | ❌ Cần thêm             |
| **product_stock**             | read, update                         | ❌ Cần thêm             |

### Bước 3: Thay hasRole bằng hasPermission trong Routes

**Ví dụ mapping route → permission:**

| Route/API                     | Permission cần                 |
| ----------------------------- | ------------------------------ |
| GET /api/users                | user:read                      |
| POST /api/users               | user:create                    |
| PUT /api/users/:id            | user:update                    |
| DELETE /api/users/:id         | user:delete                    |
| GET /api/products             | product:read                   |
| POST /api/products            | product:create                 |
| PUT /api/products/:id         | product:update                 |
| DELETE /api/products/:id      | product:delete                 |
| GET /api/orders               | order:read                     |
| PUT /api/orders/:id           | order:update                   |
| GET /api/orders/report        | order:read (hoặc order:manage) |
| GET /api/roles                | role:read                      |
| POST/PUT/DELETE /api/roles    | role:manage                    |
| GET /api/activity-logs        | activity_log:read              |
| DELETE /api/activity-logs/:id | activity_log:delete            |
| ...                           | ...                            |

**Cách triển khai:**

```javascript
// Trước (role-based)
router.use(hasRole('admin', 'manager'));

// Sau (permission-based)
router.use(hasPermission('user', 'read'));
// Hoặc cho route cụ thể:
router.get('/', hasPermission('user', 'read'), getUsers);
router.post('/', hasPermission('user', 'create'), createUser);
router.put('/:id', hasPermission('user', 'update'), updateUser);
router.delete('/:id', hasPermission('user', 'delete'), deleteUser);
```

### Bước 4: Client – Permission-based Route Protection

Tạo `PermissionProtectedRoute` thay cho `RoleProtectedRoute`:

```jsx
// PermissionProtectedRoute.jsx
const PermissionProtectedRoute = ({ resource, action, redirectTo = '/forbidden' }) => {
    const { user, loading } = useAuthStore();
    const { hasPermission } = usePermissions();

    if (loading) return <Loading />;
    if (!user)
        return (
            <Navigate
                to='/login'
                replace
            />
        );
    if (!hasPermission(resource, action))
        return (
            <Navigate
                to={redirectTo}
                replace
            />
        );

    return <Outlet />;
};

// Sử dụng
<Route
    element={
        <PermissionProtectedRoute
            resource='product'
            action='read'
        />
    }
>
    <Route
        path='/admin/products'
        element={<ProductManagementPage />}
    />
</Route>;
```

### Bước 5: Cập nhật seedRBAC – Gán đúng Permission cho Role

Đảm bảo mỗi role có đủ permission tương ứng chức năng:

- **customer**: user:read (profile), product:read, order:create, order:read
- **seller**: + order:update, stock_check:read
- **warehouse_manager**: + product:update, stock_check:_, stock_in:_, stock_return:_, supplier:_, product_stock:\*
- **manager**: + user:update, product:_, order:_, location:_, bank_account:_, member_policy:\*, ...
- **admin**: Tất cả (manage mọi resource)

---

## 4. Lợi ích khi chuyển sang Permission-based

1. **Linh hoạt**: Thay đổi quyền role không cần sửa code route
2. **Chi tiết**: Phân quyền theo từng hành động (create/read/update/delete)
3. **Đồng bộ**: Backend và Client dùng chung logic (resource + action)
4. **Mở rộng**: Thêm resource/permission mới dễ dàng
5. **Quản lý**: UI "Quản lý vai trò" đã có – chỉ cần route dùng đúng permission

---

## 5. Thứ tự triển khai đề xuất

1. **Phase 1 – Chuẩn hóa Role**
    - Cập nhật seedRBAC: thống nhất tên role (seller, manager, warehouse_manager, customer, admin)
    - Chạy migration: cập nhật user.roles nếu đang dùng tên cũ

2. **Phase 2 – Bổ sung Permission**
    - Thêm permission cho các resource còn thiếu (location, supplier, brand, ...)
    - Cập nhật seedRoles: gán permission cho từng role

3. **Phase 3 – Backend Routes**
    - Tạo file mapping route → permission (vd: `routePermissions.js`)
    - Thay `hasRole` bằng `hasPermission` từng route/group

4. **Phase 4 – Client**
    - Tạo `PermissionProtectedRoute`
    - Cập nhật `routes/index.jsx`: dùng permission thay vì role
    - Kiểm tra `usePermissions` đã dùng đúng (AdminSidebar đã dùng)

5. **Phase 5 – Kiểm thử**
    - Test từng role: customer, seller, warehouse_manager, manager, admin
    - Đảm bảo sidebar, route, API đều khớp permission

---

## 6. File cần chỉnh sửa (tóm tắt)

### Backend

- `libs/seedRBAC.js` – Chuẩn hóa role, bổ sung permission
- `middlewares/rbac.js` – Giữ nguyên, đã có hasPermission
- `routes/*.js` – Thay hasRole → hasPermission
- `controllers/orderController.js` – Các hàm canSelectSeller, canViewStoreOrders dùng checkPermission thay vì role names

### Client

- `hooks/useUserRole.js` – Có thể giữ để tương thích (isAdmin, isSeller...)
- `hooks/usePermissions.js` – Đã đúng, dùng tiếp
- `components/auth/RoleProtectedRoute.jsx` – Thêm PermissionProtectedRoute hoặc mở rộng
- `routes/index.jsx` – Dùng permission-based protection
- `config/sidebarMenuConfig.js` – Đã dùng permission, kiểm tra resource/action khớp backend

---

## 7. Kết luận

Hệ thống hiện tại **có đủ model và middleware** cho RBAC thật (Permission-based), nhưng **chưa dùng**. Toàn bộ phân quyền đang dựa trên tên role, dẫn đến:

- Khó mở rộng
- Không tận dụng Role–Permission đã thiết kế
- Rủi ro lỗi khi đổi tên role

**Khuyến nghị**: Thực hiện migration theo 5 phase trên để chuyển sang phân quyền theo **resource + action**, tận dụng đúng kiến trúc RBAC đã có.
