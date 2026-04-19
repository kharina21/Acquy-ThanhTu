# Use Cases

| # | Module | Use Case | Description | Ghi chú |
|---|--------|----------|-------------|:-------:|
| 1 | **Auth** | Login | User signs in with credentials |
| 2 | Auth | Register | New user creates an account |
| 3 | Auth | Forgot Password | User requests password reset link |
| 4 | Auth | Reset Password | User sets new password via reset link |
| 5 | Auth | Logout | User signs out |
| 6 | Auth | Refresh Token | Refresh access token when expired |
| 7 | Auth | Get Current User | Retrieve authenticated user profile |
| 8 | **Users** | List Users | View all users (admin/manager) |
| 112 | Users | Search Users | Search users by username, email, name, role |
| 9 | Users | View User Detail | View single user details |
| 10 | Users | Create User | Create new user |
| 11 | Users | Update User | Update user information |
| 12 | Users | Delete User | Remove user |
| 13 | Users | Assign Roles | Assign roles to user |
| 14 | Users | Remove Roles | Remove roles from user |
| 15 | Users | Reset Password | Admin resets user password |
| 16 | **Staffs** | List Employees | View all staff/employees |
| 117 | Staffs | Search Employees | Search employees by name, phone, role, location |
| 17 | Staffs | View Employee Detail | View single employee details |
| 18 | Staffs | Create Employee | Create new employee |
| 19 | Staffs | Update Employee | Update employee information |
| 20 | Staffs | Delete Employee | Remove employee |
| 23 | **Products** | List Products | View products (search by SKU, barcode, name) |
| 111 | Products | Search Products | Search products by SKU, barcode, name (catalog, create invoice, import) |
| 24 | Products | View Product Detail | View single product details |
| 25 | Products | Create Product | Create new product |
| 26 | Products | Update Product | Update product information |
| 27 | Products | Delete Product | Remove product |
| 28 | Products | Upload Product Image | Upload product images |
| 29 | Products | Import from Excel | Bulk import products from Excel |
| 30 | Products | Bulk Update Price | Update prices in bulk |
| 31 | Products | Print Barcode Labels | Print labels (75×130mm, 75×100mm, 35×22mm 2 cell/hàng) |
| 32 | Products | Export Barcode Excel | Export barcode data to Excel |
| 33 | **Categories** | List Categories | View all product categories |
| 116 | Categories | Search Categories | Search categories by name |
| 34 | Categories | Create Category | Create new category |
| 35 | Categories | Update Category | Update category |
| 36 | Categories | Delete Category | Remove category |
| 37 | **Brands** | List Brands | View all brands |
| 38 | Brands | Create Brand | Create new brand |
| 39 | Brands | Update Brand | Update brand |
| 40 | Brands | Delete Brand | Remove brand |
| 41 | **Usage Devices** | List Usage Devices | View all usage device types |
| 42 | Usage Devices | Create Usage Device | Create new usage device |
| 43 | Usage Devices | Update Usage Device | Update usage device |
| 44 | Usage Devices | Delete Usage Device | Remove usage device |
| 45 | **Stock Check** | List Stock Checks | View all stock check records |
| 46 | Stock Check | View Stock Check Detail | View single stock check details |
| 47 | Stock Check | Create Stock Check | Create new stock check |
| 48 | Stock Check | Confirm Stock Check | Confirm stock check and apply adjustments |
| 49 | **Stock In (Import)** | List Stock Ins | View import records (filter by code, supplier) |
| 50 | Stock In (Import) | View Stock In Detail | View single import record details |
| 51 | Stock In (Import) | Create Stock In | Create new import (search products by SKU, barcode, name) |
| 52 | Stock In (Import) | Update Stock In | Update draft import record |
| 53 | Stock In (Import) | Confirm Stock In | Confirm import and add to inventory |
| 54 | Stock In (Import) | Cancel Stock In | Cancel import record |
| 55 | Stock In (Import) | Create Stock Return | Return goods from confirmed import |
| 56 | **Stock Return** | List Stock Returns | View return records (filter by code, stock in code, supplier) |
| 57 | Stock Return | View Stock Return Detail | View single return record details |
| 58 | Stock Return | Cancel Stock Return | Cancel return and restore inventory |
| 59 | **Suppliers** | List Suppliers | View all suppliers |
| 113 | Suppliers | Search Suppliers | Search suppliers by code, name, phone |
| 60 | Suppliers | View Supplier Detail | View single supplier details |
| 61 | Suppliers | Create Supplier | Create new supplier |
| 62 | Suppliers | Update Supplier | Update supplier |
| 63 | Suppliers | Delete Supplier | Remove supplier |
| 64 | **Locations** | List Locations | View all branches/locations |
| 65 | Locations | Create Location | Create new location |
| 66 | Locations | Update Location | Update location |
| 67 | Locations | Delete Location | Remove location |
| 68 | **Product Stock** | View Product Stocks | View inventory by location |
| 69 | Product Stock | Update Stock | Update stock quantity |
| 70 | Product Stock | Bulk Update Stock | Bulk update stock quantities |
| 71 | **Customers** | List Customers | View all customers (search, filter by type) |
| 114 | Customers | Search Customers | Search customers by phone or name (create invoice, customer list) |
| 72 | Customers | Create Customer | Create new customer |
| 73 | Customers | Update Customer | Update customer information |
| 74 | Customers | Delete Customer | Soft delete customer |
| 75 | Customers | Restore Customer | Restore soft-deleted customer |
| 76 | **Member Policies** | List Member Policies | View all customer policies |
| 77 | Member Policies | Create Member Policy | Create new policy |
| 78 | Member Policies | Update Member Policy | Update policy |
| 79 | Member Policies | Delete Member Policy | Remove policy |
| 80 | **Store Profile** | View Store Profile | View store information |
| 81 | Store Profile | Update Store Profile | Update store information |
| 82 | **Cart** | View Cart | View cart items |
| 83 | Cart | Add to Cart | Add product to cart |
| 84 | Cart | Update Cart Item | Update item quantity |
| 85 | Cart | Remove from Cart | Remove item from cart |
| 86 | Cart | Clear Cart | Clear all cart items |
| 87 | **Orders** | Create Order | Create order from cart (checkout) |
| 88 | Orders | List My Orders | View user's order history |
| 89 | Orders | View Order Detail | View single order details |
| 90 | Orders | Update Order | Update order status and payment status (admin/manager) |
| 91 | **Roles** | List Roles | View all roles |
| 93 | Roles | Create Role | Create new role |
| 94 | Roles | Update Role | Update role |
| 95 | Roles | Delete Role | Remove role |
| 96 | **Activity Logs** | List Activity Logs | View activity logs (admin) |
| 115 | Activity Logs | Search Activity Logs | Search/filter activity logs by description, resource, action |
| 97 | Activity Logs | List My Logs | View own activity logs |
| 98 | Activity Logs | Delete Activity Log | Remove activity log |
| 99 | **Profile** | View Profile | View own profile |
| 100 | Profile | Update Profile | Update own profile |
| 101 | **Dashboard** | View Dashboard Stats | View revenue, paid orders, top customers, top products (filter by branch, period) |
| 102 | Dashboard | Switch Branch | Select branch or "Tất cả chi nhánh" for aggregated view |
| 103 | Orders | List Admin Orders | View orders by type: invoices, pre-orders, returns (filter by status, payment) | |
| 104 | Orders | Create Invoice | Create in-store order (bán tại quầy) | |
| 105 | Orders | View Order Report | View order report by date range and branch | |
| 106 | **Payment (PayOS)** | Create Payment Link | Create online payment link for order | |
| 107 | Payment (PayOS) | Webhook Confirm | PayOS callback updates payment status when paid | |
| 108 | Payment (PayOS) | Sync Payment Status | Check and sync payment status from PayOS API | |
| 109 | Locations | Set Online Location | Set branch that receives online orders (isOnlineLocation) | |
| 110 | Locations | Assign Manager Locations | Assign branches to manager (Employee.locations) | |
| 118 | Orders | Refund Order | Hoàn tiền khi hủy đơn đã thanh toán (cập nhật refundBankName, refundBankAccount) | 🟡 |
| 119 | **Chat AI** | Chat AI Support | Hỗ trợ khách hàng hỏi đáp về cửa hàng, sản phẩm | 🟡 |
| 120 | Orders | Create Pre-Order | Khách tới đặt hàng, nhân viên thêm vào bảng đặt hàng (isPreOrder) | 🟡 |
| 121 | **Feedback** | Submit Feedback | Người dùng gửi phản hồi, đánh giá | 🟡 |
| 122 | Feedback | Manage Feedback | Quản lý cửa hàng xem và phản hồi feedback từ khách | 🟡 |
| 123 | Orders | Confirm Warehouse Outbound (Online) | Đơn online giữ chỗ tồn; admin/kho xác nhận xuất kho mới trừ quantity và tạo phiếu xuất | 🔵 |
| 124 | **Warehouse** | Stock Out (Phiếu xuất) | Tạo phiếu xuất nháp, xác nhận trừ tồn (xuất điều chỉnh / nội bộ); đơn online có phiếu từ xác nhận kho | 🔵 |
| 125 | Warehouse | NXT Inventory Report | Báo cáo xuất nhập tồn theo kỳ và chi nhánh (nhập, xuất phiếu, trả NCC, kiểm kho) | 🔵 |
| 126 | Warehouse | Stock In Lines Report | Báo cáo nhập hàng theo dòng phiếu (mã đơn = mã phiếu nhập), xuất Excel | 🔵 |
| 127 | Warehouse | Stock Out Lines Report | Báo cáo xuất kho theo dòng phiếu (mã đơn = mã đơn bán hoặc mã phiếu), xuất Excel | 🔵 |
| 128 | Warehouse | Auto-generate stock-in serials | Nhập kho: sinh seri số tự động theo số lượng (mỗi cái một mã), không trùng seri phiếu khác và không trùng mã SKU sản phẩm | 🔵 |

---

**Chú thích:** 🟡 = Kế hoạch / đặc biệt (hoàn tiền, Chat AI, đặt hàng, feedback) · 🔵 = Kho và báo cáo đã triển khai (xuất kho online, phiếu xuất, NXT, báo cáo dòng phiếu)

**Nguồn:** `client/src/data/useCases.js` – Single source of truth. UseCasesPage và USE_CASES.md đồng bộ từ file này.
