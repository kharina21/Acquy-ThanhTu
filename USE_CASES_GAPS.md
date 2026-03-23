# Use Cases – Chưa hoàn thiện / Thiếu

Tổng hợp các use case chưa được triển khai đầy đủ hoặc thiếu trong hệ thống.

---

## 1. UC chưa hoàn thiện (có trong USE_CASES nhưng thiếu Backend/Frontend)

| UC ID | Module | Use Case | Trạng thái | Ghi chú |
|-------|--------|----------|------------|---------|
| 117 | Staffs | Search Employees | Thiếu Backend + Frontend | API `GET /employees` không có param `search`. StaffManagementPage chỉ có filter status, locationId, chưa có ô tìm kiếm theo tên/SĐT. |
| 116 | Categories | Search Categories | Chỉ client-side | API `GET /categories` trả về tất cả, không có param search. CategoryManagementPage filter theo tên trên client. |
| 93 | Roles | Create Role | Thiếu UI | Backend + roleService đủ. Chưa có trang Quản lý vai trò; chỉ dùng List Roles trong UserManagement. |
| 94 | Roles | Update Role | Thiếu UI | Tương tự Create Role. |
| 95 | Roles | Delete Role | Thiếu UI | Tương tự Create Role. |
| 14 | Users | Remove Roles | Thiếu UI | Backend có `DELETE /users/:id/roles`. UserTable chỉ gán 1 role, không có nút revoke/remove. |
| 98 | Activity Logs | Delete Activity Log | Thiếu UI | Backend có `DELETE /activity-logs/:id`. ActivityLogPage không có nút xóa. |
| 96 | Activity Logs | List Activity Logs | Thiếu route | ActivityLogPage tồn tại nhưng không có route. Admin không truy cập được. |

---

## 2. Feature có sẵn nhưng thiếu UC

| Module | Feature | Mô tả |
|--------|---------|-------|
| Bank Accounts | Quản lý tài khoản ngân hàng | CRUD tài khoản ngân hàng theo chi nhánh (StoreProfilePage > BankAccountSection). Backend: `bankAccountRoute.js`. |
| Work Schedule | Quản lý lịch làm việc | Đã xóa khỏi UC trước đó. Backend + StaffManagementPage (tab Schedule) vẫn có đầy đủ. |
| Shifts | Quản lý ca làm việc | Đã xóa khỏi UC trước đó. Backend + StaffManagementPage vẫn có. |

---

## 3. Gợi ý thực hiện

### Mức độ ưu tiên cao
1. **Search Employees (UC 117)**: Thêm `search` vào `GET /employees`, thêm ô search vào StaffManagementPage.
2. **Activity Logs route**: Thêm route `/admin/activity-logs` và link sidebar cho admin.

### Mức độ ưu tiên trung bình
3. **Search Categories (UC 116)**: Thêm `search` vào `GET /categories` hoặc giữ client-side nếu dataset nhỏ.
4. **Delete Activity Log (UC 98)**: Thêm nút xóa trên ActivityLogPage.

### Mức độ ưu tiên thấp
5. **Role Management (UC 93, 94, 95)**: Tạo trang Quản lý vai trò nếu cần tạo/sửa/xóa role.
6. **Remove Roles (UC 14)**: Thêm nút revoke nếu muốn user có thể không có role.
7. **Bank Accounts**: Thêm UC vào useCases.js và USE_CASES.md.
8. **Work Schedule / Shifts**: Thêm lại UC nếu muốn giữ tính năng trong tài liệu.

---

## 4. UC đánh dấu vàng (Hoàn tiền, Chat AI, Đặt hàng, Feedback)

Các use case mới được thêm với đánh dấu màu vàng trên UseCasesPage:

| UC ID | Module | Use Case | Mô tả | Trạng thái |
|-------|--------|----------|-------|------------|
| 118 | Orders | Refund Order | Hoàn tiền khi hủy đơn đã thanh toán | Một phần: CancelOrderModal có nhập thông tin hoàn tiền khi hủy đơn. Cần luồng refund riêng nếu cần. |
| 119 | Chat AI | Chat AI Support | Hỗ trợ khách hàng hỏi đáp về cửa hàng, sản phẩm | Chưa có |
| 120 | Orders | Create Pre-Order | Khách tới đặt hàng, nhân viên thêm vào bảng đặt hàng | Có: CreateInvoicePage có isPreOrder, AdminOrderManagementPage type="pre-orders" |
| 121 | Feedback | Submit Feedback | Người dùng gửi phản hồi, đánh giá | Chưa có |
| 122 | Feedback | Manage Feedback | Quản lý cửa hàng xem và phản hồi feedback | Chưa có |

---

*Cập nhật lần cuối: dựa trên phân tích codebase.*
