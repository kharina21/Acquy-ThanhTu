# Thiết kế tổng thể – Hệ thống quản lý cửa hàng Ắc quy Thanh Tú

Tài liệu tham khảo cho: phân quyền RBAC, vai trò nhân sự, thiết kế database (đa cơ sở, đơn hàng, tồn kho), và tích hợp VietQR.

---

## 1. Tổng quan nghiệp vụ

| Nội dung       | Mô tả                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Sản phẩm**   | Ắc quy, sạc điện, sản phẩm khác; phân loại theo **Category** (loại hàng) và **Brand** (thương hiệu).                 |
| **Cơ sở**      | Hiện 1 cơ sở, thiết kế sẵn cho 2+ cơ sở (multi-location).                                                            |
| **Kênh bán**   | Online (website) + tại quầy (in-store). Nhân viên dùng chức năng “Bán hàng” để tạo đơn (chọn kênh online/trực tiếp). |
| **Thanh toán** | VietQR (API) và có thể mở rộng tiền mặt/chuyển khoản thủ công.                                                       |
| **Phân quyền** | RBAC (Role-Based Access Control): User → Role → Permission.                                                          |

---

## 2. Đề xuất vai trò (Roles) và quyền (Permissions)

### 2.1. Stock Manager vs Warehouse Manager – Nên gộp hay tách?

-   **Stock Manager**: thường gắn với _kiểm kho, điều chỉnh tồn, báo cáo tồn_.
-   **Warehouse Manager**: _nhập kho, xuất kho, chuyển kho giữa cơ sở_.

**Đề xuất với quy mô 1–2 cơ sở:**

-   **Gộp thành một role: `warehouse_manager` (Quản lý kho)**
    -   Bao gồm: kiểm kho (stock check), cập nhật tồn, nhập/xuất kho, (sau này) chuyển kho giữa các cơ sở.
    -   Ưu điểm: đơn giản, ít role, dễ gán và bảo trì.

Nếu sau này quy mô lớn (nhiều kho, nhiều người), có thể tách:

-   `stock_manager`: chỉ kiểm kho, xem báo cáo tồn, điều chỉnh tồn (theo quy trình đã duyệt).
-   `warehouse_manager`: nhập/xuất/chuyển kho, quản lý phiếu kho.

---

### 2.2. Danh sách role đề xuất

| Role (name)           | Mô tả                       | Đối tượng                                                                          |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| **user**              | Khách hàng / người dùng web | Khách mua online, đăng ký tài khoản.                                               |
| **seller**            | Nhân viên bán hàng          | Tạo đơn (online + tại quầy), xem sản phẩm, cập nhật đơn cơ bản.                    |
| **warehouse_manager** | Quản lý kho                 | Kiểm kho, nhập/xuất, tồn theo cơ sở (khi có multi-location).                       |
| **manager**           | Quản lý cửa hàng            | Quản lý nhân viên (user), sản phẩm, đơn, giá, báo cáo; không quản role/permission. |
| **admin**             | Quản trị hệ thống           | Toàn quyền: user, role, permission, cấu hình, báo cáo toàn hệ thống.               |

**Tùy chọn:** Nếu bạn muốn phân biệt “chủ cửa hàng” và “admin kỹ thuật”, có thể thêm role **owner** (quyền gần admin nhưng không đụng cấu hình kỹ thuật). Hiện tại code đang dùng `admin` và `manager`; có thể bỏ `owner` và coi admin = chủ/người quản trị cao nhất.

---

### 2.3. Ma trận quyền gợi ý (Permission theo resource/action)

Quy ước: `resource:action` (create, read, update, delete, manage). `manage` = toàn quyền trên resource đó.

| Resource                    | user                    | seller                          | warehouse_manager               | manager                      | admin        |
| --------------------------- | ----------------------- | ------------------------------- | ------------------------------- | ---------------------------- | ------------ |
| **user**                    | read (self)             | read                            | read                            | read, update                 | manage       |
| **product**                 | read                    | read, (update số lượng khi bán) | read, update (tồn)              | create, read, update, delete | manage       |
| **order**                   | create, read (của mình) | create, read, update            | read                            | read, update, delete         | manage       |
| **inventory / stock_check** | -                       | read                            | create, read, update            | read, update (confirm)       | manage       |
| **location** (khi có)       | -                       | read                            | read, update (tồn tại location) | read                         | manage       |
| **role / permission**       | -                       | -                               | -                               | read (xem role nhân viên)    | manage       |
| **activity_log**            | -                       | -                               | -                               | read                         | read, delete |

Ghi chú nhanh:

-   **Seller**: không cần `product:create` hay `product:delete`; chỉ cần đọc và trừ tồn khi tạo đơn (hoặc gọi API cập nhật tồn do backend xử lý).
-   **Warehouse_manager**: cần `stock_check` (kiểm kho) và sau này `inventory`/`location` cho nhập/xuất/chuyển kho.
-   **Manager**: quản lý nhân viên (gán role, đổi trạng thái) nhưng không tạo/xóa permission hay role mới → dùng `user:update` + gọi API gán role (backend giới hạn manager chỉ gán được seller/warehouse_manager, không gán admin).

---

### 2.4. Quản lý quyền và quản lý nhân viên

-   **Quản lý quyền (Role/Permission)**

    -   Chỉ **admin** được: tạo/sửa/xóa Role, gán Permission cho Role.
    -   Có thể có trang “Quản lý vai trò” (danh sách role, sửa permission của từng role).
    -   **Manager** chỉ nên **xem** danh sách role để gán cho nhân viên, không sửa định nghĩa role/permission.

-   **Quản lý nhân viên (User)**
    -   **Admin**: toàn quyền (tạo/sửa/khóa/xóa user, gán bất kỳ role nào).
    -   **Manager**: tạo/sửa user, gán role **seller**, **warehouse_manager** (không được gán **admin** hoặc **manager**).
    -   Backend: khi gán role, kiểm tra `req.user`: nếu là manager thì `allowedRoles = ['seller', 'warehouse_manager']`; nếu admin thì được mọi role.

---

## 3. Thiết kế Database (gợi ý)

### 3.1. Hiện trạng (đã có)

-   **User**, **Role**, **Permission** (RBAC).
-   **Category**, **Brand**, **Product** (category = loại hàng, brand = thương hiệu).
-   **StockCheck** (kiểm kho) – chưa gắn với cơ sở (location).

### 3.2. Chuẩn bị đa cơ sở (1 hiện tại, 2+ sau này)

-   **Location (Store)**

    -   `name`, `code`, `address`, `phone`, `isActive`.
    -   Mỗi đơn hàng, mỗi tồn kho gắn với một `location`.

-   **Product**

    -   Giữ làm **master data** (SKU, tên, giá, category, brand, v.v.).
    -   **Tồn kho theo cơ sở**: không lưu `quantity` trên Product nữa (hoặc giữ làm “tổng” tùy bạn), thêm bảng tồn theo location.

-   **ProductStock** (tồn theo từng cơ sở)

    -   `product` (ref Product), `location` (ref Location), `quantity`, `updatedAt`.
    -   Unique index `(product, location)`.
    -   Khi bán (order) hoặc nhập/xuất/kiểm kho: cập nhật `ProductStock` theo `location` của đơn hoặc phiếu.

-   **StockCheck**
    -   Thêm `location` (ref Location).
    -   Kiểm kho theo từng cơ sở; khi confirm thì cập nhật `ProductStock` tại `location` đó.

### 3.3. Đơn hàng (Order) – chưa có trong code

-   **Order**

    -   `code` (mã đơn), `channel`: `online` | `in_store`.
    -   `customer` (ref User, nullable cho khách vãng lai).
    -   `location` (ref Location) – cửa hàng thực hiện đơn.
    -   `createdBy` (ref User – nhân viên tạo đơn).
    -   `items`: [{ `product`, `quantity`, `price`, `total` }].
    -   `totalAmount`, `status`: `pending`, `confirmed`, `paid`, `cancelled`, …
    -   `paymentMethod`: `vietqr`, `cash`, `transfer`, …
    -   `paymentStatus`: `pending`, `paid`, `failed`, `refunded`.
    -   `vietqrTransactionId`, `paidAt`, … (cho VietQR callback).

-   **OrderItem** (có thể nhúng trong Order hoặc collection riêng tùy bạn).

Khi tạo đơn: trừ tồn từ `ProductStock` tại `location` của đơn (và cộng lại nếu hủy đơn).

### 3.4. User và cơ sở (tùy chọn)

-   Nếu nhân viên cố định theo từng cơ sở: thêm `User.location` (ref Location) hoặc `User.locations` (mảng).
-   Nếu nhân viên làm chung nhiều cơ sở: không cần, chỉ cần phân quyền theo role; khi tạo đơn chọn `location`.

### 3.5. Chi nhánh đang chọn (currentLocationId)

-   Trên navbar, user chọn **một chi nhánh** (useBranchStore.currentLocationId). Mọi phần trong hệ thống đều **theo chi nhánh đó**:
-   **Sản phẩm**: danh sách hiển thị tồn tại chi nhánh đang chọn; thêm mới / import Excel gán tồn cho chi nhánh đó (chi nhánh khác = 0).
-   **Kiểm kho**: danh sách phiếu lọc theo chi nhánh đang chọn; tạo phiếu mới mặc định chi nhánh đang chọn; chọn sản phẩm lấy tồn tại chi nhánh đó.
-   **Tồn theo chi nhánh**: tab đồng bộ chi nhánh được chọn với navbar.
-   **Báo cáo / đơn hàng (sau này)**: khi làm báo cáo hoặc danh sách đơn, mặc định lọc theo `currentLocationId`; API nhận `locationId` và trả về dữ liệu đúng chi nhánh.

---

## 4. VietQR (thanh toán)

-   **Tài liệu**: [VietQR API](https://api.vietqr.vn), [Tích hợp VietQR](https://doc.vietqr.vn/vietqr-doc/api-vietqr-callback/api-vietqr-host2host/integrated-document-for-payment-service-vietqr).
-   **Luồng thường**:
    1. Khách chọn thanh toán VietQR → Backend gọi API VietQR tạo mã QR / payment link.
    2. Khách quét QR và chuyển khoản.
    3. VietQR gọi **callback** (webhook) về backend của bạn với trạng thái thanh toán.
    4. Backend cập nhật Order: `paymentStatus = paid`, `paidAt`, lưu `vietqrTransactionId`.
-   **Bảo mật**: Xác thực callback (signature/secret từ VietQR), chỉ cập nhật đơn khi callback hợp lệ.

---

## 5. Đồng bộ với code hiện tại

-   **Role trong seed**: Hiện có `user`, `staff`, `manager`, `admin`. Một số route/notification dùng `owner` (không có trong seed).
-   **Đề xuất**:
    -   Đổi `staff` → **seller** (nếu đúng nghiệp vụ “nhân viên bán hàng”).
    -   Thêm role **warehouse_manager** và permissions cho `stock_check` / `inventory`.
    -   Thay mọi chỗ dùng `owner` bằng `admin` (hoặc thêm role `owner` vào seed nếu bạn muốn tách chủ cửa hàng).
-   **Product route**: Đang `hasRole('admin', 'manager')` – ổn. Chỉ cần thống nhất: không dùng `owner` nếu không seed role đó.
-   **Notification**: Đang gửi cho `['admin', 'owner', 'manager']` → nên đổi thành `['admin', 'manager']` hoặc thêm `owner` vào seed.

---

## 6. Lộ trình gợi ý

1. **RBAC**: Cập nhật seed (seller, warehouse_manager, bỏ owner hoặc thêm owner), bổ sung permission `stock_check` / `inventory` nếu cần. Đồng bộ route và notification với danh sách role thực tế.
2. **Order**: Tạo model Order + OrderItem, API tạo đơn (online/in_store), trừ tồn (tạm thời trừ trên ProductStock/Product.totalStock nếu chưa có Location).
3. **Location + ProductStock**: Thêm Location, ProductStock; chuyển StockCheck và Order sang gắn location; cập nhật logic trừ tồn theo location.
4. **VietQR**: Đăng ký merchant, implement tạo mã QR và endpoint callback, cập nhật trạng thái thanh toán đơn.
5. **Quản lý nhân viên**: Phân quyền rõ manager (chỉ gán seller/warehouse_manager), admin (gán mọi role); UI “Quản lý vai trò” chỉ cho admin.

---

## 7. Tài liệu tham khảo

-   RBAC: [WorkOS – RBAC best practices](https://workos.com/blog/rbac-best-practices).
-   Retail roles: [Shopify – Staff roles and permissions](https://www.shopify.com/retail/staff-roles-and-permissions).
-   Multi-store inventory: [Database design multi-store inventory](https://dba.stackexchange.com/questions/188812/most-suitable-database-design-for-multi-store-inventory), [Multi warehouses inventory](https://stackoverflow.com/questions/34598335/multi-warehouses-inventory-stock-database-design).
-   VietQR: [api.vietqr.vn](https://api.vietqr.vn), [doc.vietqr.vn](https://doc.vietqr.vn).

Nếu bạn gửi thêm file model/route hiện tại (Order, Product, User), có thể đề xuất chi tiết schema và API từng bước cho từng phase.
