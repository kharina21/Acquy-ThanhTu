# Giải thích cách hoạt động của RBAC (Role-Based Access Control)

## 📋 Tổng quan

RBAC là hệ thống phân quyền dựa trên vai trò (Role), cho phép quản lý quyền truy cập một cách linh hoạt và có cấu trúc. Thay vì hard-code role trong User model, hệ thống sử dụng 3 thành phần chính:

1. **User** - Người dùng
2. **Role** - Vai trò (user, seller, admin)
3. **Permission** - Quyền hạn (create, read, update, delete, manage)

---

## 🏗️ Kiến trúc và Mối quan hệ

```
User ──(Many-to-Many)──> Role ──(Many-to-Many)──> Permission
```

### 1. **Permission (Quyền hạn)**

-   **Mục đích**: Định nghĩa các hành động cụ thể trên một tài nguyên
-   **Cấu trúc**:
    -   `name`: Tên permission (vd: "user:create")
    -   `resource`: Tài nguyên (vd: "user", "product", "order")
    -   `action`: Hành động (create, read, update, delete, manage)
    -   `description`: Mô tả

**Ví dụ Permission:**

```javascript
{
  name: "product:create",
  resource: "product",
  action: "create",
  description: "Create products"
}
```

### 2. **Role (Vai trò)**

-   **Mục đích**: Nhóm các permissions lại thành một vai trò có ý nghĩa
-   **Cấu trúc**:
    -   `name`: Tên role (vd: "user", "seller", "admin")
    -   `permissions`: Mảng các Permission IDs
    -   `isActive`: Bật/tắt role
    -   `description`: Mô tả

**Ví dụ Role:**

```javascript
{
  name: "seller",
  permissions: [
    ObjectId("permission1"), // product:create
    ObjectId("permission2"), // product:read
    ObjectId("permission3"), // product:update
  ],
  isActive: true
}
```

### 3. **User (Người dùng)**

-   **Mục đích**: Người dùng trong hệ thống
-   **Cấu trúc**:
    -   `roles`: Mảng các Role IDs (user có thể có nhiều roles)
    -   Các thông tin khác: username, email, password, etc.

**Ví dụ User:**

```javascript
{
  username: "john_doe",
  email: "john@example.com",
  roles: [
    ObjectId("role_user_id"),   // role "user"
    ObjectId("role_seller_id")  // role "seller"
  ]
}
```

---

## 🔄 Luồng hoạt động

### **Bước 1: Khởi tạo (Seed)**

```bash
npm run seed:rbac
```

Script này sẽ:

1. Tạo các **Permissions** mặc định (user:create, product:read, etc.)
2. Tạo các **Roles** mặc định (user, seller, admin)
3. Gán permissions cho từng role

**Ví dụ sau khi seed:**

-   **Role "user"**: có permissions [user:read, product:read, order:create, order:read]
-   **Role "seller"**: có permissions [user:read, product:create, product:read, product:update, product:delete, order:read, order:update]
-   **Role "admin"**: có TẤT CẢ permissions (manage)

### **Bước 2: Gán Role cho User**

Khi user đăng ký, hệ thống tự động gán role mặc định "user":

```javascript
import { assignDefaultRole } from './libs/rbacHelpers.js';

const user = new User(userData);
await assignDefaultRole(user); // Gán role "user"
```

### **Bước 3: Kiểm tra quyền khi truy cập**

#### **A. Kiểm tra Role (hasRole middleware)**

```javascript
import { hasRole } from './middlewares/rbac.js';

router.get('/admin/users', hasRole('admin'), getUsers);
```

**Cách hoạt động:**

1. Middleware nhận request
2. Lấy `req.user._id` (từ authentication middleware trước đó)
3. Query User từ DB và populate roles
4. Lấy danh sách tên roles của user: `['user', 'seller']`
5. Kiểm tra xem user có role "admin" không
6. Nếu có → cho phép tiếp tục (`next()`)
7. Nếu không → trả về 403 Forbidden

**Ví dụ:**

```javascript
// User có roles: ['user', 'seller']
hasRole('admin'); // ❌ False → 403 Forbidden
hasRole('seller'); // ✅ True → Cho phép
hasRole('user', 'seller'); // ✅ True (có ít nhất 1 role) → Cho phép
```

#### **B. Kiểm tra Permission (hasPermission middleware)**

```javascript
import { hasPermission } from './middlewares/rbac.js';

router.post('/products', hasPermission('product', 'create'), createProduct);
```

**Cách hoạt động:**

1. Middleware nhận request với `resource` và `action`
2. Lấy `req.user._id`
3. Query User và populate:
    - `roles` → `permissions` (nested populate)
4. Thu thập TẤT CẢ permissions từ tất cả roles của user
5. Kiểm tra xem có permission `product:create` hoặc `product:manage` không
6. Nếu có → cho phép tiếp tục
7. Nếu không → trả về 403 Forbidden

**Ví dụ:**

```javascript
// User có role "seller" với permissions:
// [product:create, product:read, product:update, product:delete]

hasPermission('product', 'create'); // ✅ True → Cho phép
hasPermission('product', 'delete'); // ✅ True → Cho phép
hasPermission('user', 'delete'); // ❌ False → 403 Forbidden
```

**Lưu ý đặc biệt:**

-   Permission `manage` được coi là "super permission" - có quyền làm TẤT CẢ actions trên resource đó
-   Ví dụ: Nếu role có `product:manage` → có thể create, read, update, delete products

---

## 🛠️ Helper Functions

### **1. checkRole(user, ...roleNames)**

Dùng trong controller để kiểm tra role:

```javascript
import { checkRole } from './middlewares/rbac.js';

const user = await User.findById(userId).populate('roles');
if (checkRole(user, 'admin', 'seller')) {
    // User có role admin hoặc seller
}
```

### **2. checkPermission(user, resource, action)**

Dùng trong controller để kiểm tra permission:

```javascript
import { checkPermission } from './middlewares/rbac.js';

const user = await User.findById(userId).populate({ path: 'roles', populate: { path: 'permissions' } });

if (checkPermission(user, 'product', 'create')) {
    // User có quyền tạo product
}
```

### **3. assignRoleByName(user, roleName)**

Gán role cho user:

```javascript
import { assignRoleByName } from './libs/rbacHelpers.js';

await assignRoleByName(user, 'seller');
// User giờ có thêm role "seller"
```

### **4. removeRoleByName(user, roleName)**

Xóa role khỏi user:

```javascript
import { removeRoleByName } from './libs/rbacHelpers.js';

await removeRoleByName(user, 'seller');
// User không còn role "seller" nữa
```

---

## 📊 Ví dụ thực tế

### **Scenario 1: User đăng ký**

```javascript
// 1. Tạo user mới
const user = new User({
    username: 'newuser',
    email: 'newuser@example.com',
    password: hashedPassword,
});

// 2. Gán role mặc định
await assignDefaultRole(user);
// User giờ có role "user" với permissions:
// - user:read
// - product:read
// - order:create
// - order:read
```

### **Scenario 2: User muốn tạo product**

```javascript
// Route
router.post(
    '/products',
    authenticate, // Middleware xác thực
    hasPermission('product', 'create'), // Kiểm tra quyền
    createProduct
);

// Flow:
// 1. User gửi POST /products
// 2. authenticate → set req.user
// 3. hasPermission('product', 'create'):
//    - Lấy user từ DB với roles và permissions
//    - Kiểm tra: user có permission "product:create"?
//    - User có role "user" → chỉ có "product:read" → ❌ 403 Forbidden
//    - User có role "seller" → có "product:create" → ✅ Cho phép
```

### **Scenario 3: Admin quản lý users**

```javascript
// Route
router.get(
    '/admin/users',
    authenticate,
    hasRole('admin'), // Chỉ admin mới được
    getAllUsers
);

// Flow:
// 1. User gửi GET /admin/users
// 2. authenticate → set req.user
// 3. hasRole('admin'):
//    - Lấy user với roles
//    - Kiểm tra: user có role "admin"?
//    - User có role "user" → ❌ 403 Forbidden
//    - User có role "admin" → ✅ Cho phép
```

### **Scenario 4: User có nhiều roles**

```javascript
// User có cả role "user" và "seller"
const user = {
    username: "john",
    roles: [
        { name: "user", permissions: [...] },
        { name: "seller", permissions: [...] }
    ]
}

// Kiểm tra:
hasRole('user')     // ✅ True
hasRole('seller')   // ✅ True
hasRole('admin')    // ❌ False

// Permissions = tất cả permissions từ cả 2 roles
hasPermission('product', 'create')  // ✅ True (từ role seller)
hasPermission('order', 'read')      // ✅ True (từ role user)
```

---

## 🎯 Lợi ích của RBAC

1. **Linh hoạt**: Dễ dàng thêm/sửa/xóa roles và permissions mà không cần sửa code
2. **Mở rộng**: User có thể có nhiều roles
3. **Bảo mật**: Kiểm tra quyền chi tiết đến từng action trên từng resource
4. **Quản lý tập trung**: Tất cả permissions được quản lý ở một nơi
5. **Dễ bảo trì**: Không hard-code, dễ thay đổi logic phân quyền

---

## 🔍 So sánh: Hard-code vs RBAC

### **Trước (Hard-code):**

```javascript
// User model
role: {
    type: String,
    enum: ['user', 'seller', 'admin'],
    default: 'user'
}

// Kiểm tra quyền
if (user.role === 'admin') {
    // Cho phép
}
```

**Vấn đề:**

-   Khó thêm role mới (phải sửa code)
-   Không thể có nhiều roles
-   Không kiểm tra được permission chi tiết
-   Phải sửa code mỗi khi thay đổi logic phân quyền

### **Sau (RBAC):**

```javascript
// User model
roles: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
    },
];

// Kiểm tra quyền
hasPermission('product', 'create'); // Linh hoạt, chi tiết
```

**Ưu điểm:**

-   Dễ thêm role/permission mới (chỉ cần thêm vào DB)
-   User có thể có nhiều roles
-   Kiểm tra permission chi tiết
-   Không cần sửa code khi thay đổi logic

---

## 📝 Tóm tắt

RBAC hoạt động theo nguyên tắc:

1. **Permission** định nghĩa quyền cụ thể (resource + action)
2. **Role** nhóm các permissions lại
3. **User** được gán một hoặc nhiều roles
4. Khi kiểm tra quyền: Lấy tất cả permissions từ tất cả roles của user → Kiểm tra xem có permission cần thiết không

Hệ thống này giúp quản lý phân quyền một cách linh hoạt, mở rộng và dễ bảo trì!
