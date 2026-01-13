# Notification System Guide

## Tổng quan

Hệ thống thông báo cho phép gửi thông báo đến users dựa trên roles của họ. Khi có sự kiện quan trọng (như sản phẩm mới được thêm), hệ thống sẽ tự động tạo thông báo cho admin, owner, và manager.

## Cấu trúc

### Backend

1. **Model**: `backend/src/models/Notification.js`
   - Lưu trữ thông báo với các thông tin: userId, title, message, type, resource, resourceId, isRead, etc.

2. **Controller**: `backend/src/controllers/notificationController.js`
   - CRUD operations cho notifications
   - Tạo notification cho một user hoặc nhiều users theo roles

3. **Routes**: `backend/src/routes/notificationRoute.js`
   - API endpoints cho notification management

4. **Helper**: `backend/src/libs/notificationHelper.js`
   - Helper functions để tạo notifications dễ dàng hơn

### Frontend

1. **Service**: `client/src/services/notificationService.js`
   - API calls để tương tác với backend

2. **Components**:
   - `NotificationBell`: Component hiển thị icon chuông với badge số lượng chưa đọc
   - `NotificationDropdown`: Dropdown hiển thị danh sách notifications

## Cách sử dụng

### 1. Tạo notification khi có sản phẩm mới

Trong product controller, sau khi tạo sản phẩm thành công:

```javascript
import { notifyProductCreated } from '../libs/notificationHelper.js';

export const createProduct = async (req, res) => {
    try {
        // ... logic tạo sản phẩm
        const product = await Product.create({ ...productData });
        
        // Tạo notification cho admin, owner, manager
        await notifyProductCreated({
            productId: product._id,
            productName: product.name,
            createdBy: req.user._id,
        });
        
        res.status(201).json({ product });
    } catch (error) {
        // ... error handling
    }
};
```

### 2. Tạo notification cho các roles cụ thể

```javascript
import { createNotificationForRoles } from '../libs/notificationHelper.js';

await createNotificationForRoles({
    roleNames: ['admin', 'owner', 'manager'],
    title: 'Sản phẩm mới',
    message: `Sản phẩm "${productName}" đã được thêm vào hệ thống`,
    type: 'product',
    resource: 'product',
    resourceId: productId,
    actionUrl: `/admin/products/${productId}`,
    metadata: {
        productName,
        createdBy,
    },
});
```

### 3. Tạo notification cho một user cụ thể

```javascript
import { createNotificationForUser } from '../libs/notificationHelper.js';

await createNotificationForUser({
    userId: user._id,
    title: 'Thông báo',
    message: 'Bạn có một thông báo mới',
    type: 'info',
    resource: 'user',
    resourceId: user._id,
    actionUrl: '/profile',
});
```

## API Endpoints

### GET `/api/notifications/me`
Lấy danh sách notifications của user hiện tại
- Query params: `page`, `limit`, `isRead`, `type`

### GET `/api/notifications/unread-count`
Lấy số lượng notifications chưa đọc

### PUT `/api/notifications/:id/read`
Đánh dấu một notification là đã đọc

### PUT `/api/notifications/read-all`
Đánh dấu tất cả notifications là đã đọc

### DELETE `/api/notifications/:id`
Xóa một notification

### DELETE `/api/notifications/read/all`
Xóa tất cả notifications đã đọc

### POST `/api/notifications` (Admin/Owner/Manager only)
Tạo notification mới

### POST `/api/notifications/roles` (Admin/Owner/Manager only)
Tạo notifications cho các roles

## Frontend Integration

NotificationBell component đã được tích hợp vào AdminLayout. Nó sẽ:
- Hiển thị icon chuông với badge số lượng chưa đọc
- Tự động cập nhật mỗi 30 giây
- Mở dropdown khi click vào

## Notification Types

- `product`: Thông báo về sản phẩm
- `order`: Thông báo về đơn hàng
- `user`: Thông báo về user
- `system`: Thông báo hệ thống
- `info`: Thông tin chung
- `warning`: Cảnh báo
- `error`: Lỗi

## Ví dụ tích hợp với Product Controller

```javascript
// backend/src/controllers/productController.js
import { notifyProductCreated } from '../libs/notificationHelper.js';

export const createProduct = async (req, res) => {
    try {
        const { name, price, description } = req.body;
        
        const product = await Product.create({
            name,
            price,
            description,
            createdBy: req.user._id,
        });
        
        // Tạo notification
        await notifyProductCreated({
            productId: product._id,
            productName: product.name,
            createdBy: req.user._id,
        });
        
        res.status(201).json({ product });
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
};
```

