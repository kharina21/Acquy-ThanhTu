# Use Cases

| # | Module | Use Case | Description |
|---|--------|----------|-------------|
| 1 | **Auth** | Login | User signs in with credentials |
| 2 | Auth | Register | New user creates an account |
| 3 | Auth | Forgot Password | User requests password reset link |
| 4 | Auth | Reset Password | User sets new password via reset link |
| 5 | Auth | Logout | User signs out |
| 6 | Auth | Refresh Token | Refresh access token when expired |
| 7 | Auth | Get Current User | Retrieve authenticated user profile |
| 8 | **Users** | List Users | View all users (admin/manager) |
| 9 | Users | View User Detail | View single user details |
| 10 | Users | Create User | Create new user |
| 11 | Users | Update User | Update user information |
| 12 | Users | Delete User | Remove user |
| 13 | Users | Assign Roles | Assign roles to user |
| 14 | Users | Remove Roles | Remove roles from user |
| 15 | Users | Reset Password | Admin resets user password |
| 16 | **Staffs** | List Employees | View all staff/employees |
| 17 | Staffs | View Employee Detail | View single employee details |
| 18 | Staffs | Create Employee | Create new employee |
| 19 | Staffs | Update Employee | Update employee information |
| 20 | Staffs | Delete Employee | Remove employee |
| 21 | Staffs | Manage Work Schedule | Create/update/delete work schedules |
| 22 | Staffs | Manage Shifts | Create/update/delete shifts |
| 23 | **Products** | List Products | View products (search by SKU, barcode, name) |
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
| 50 | Stock In | View Stock In Detail | View single import record details |
| 51 | Stock In | Create Stock In | Create new import (search products by SKU, barcode, name) |
| 52 | Stock In | Update Stock In | Update draft import record |
| 53 | Stock In | Confirm Stock In | Confirm import and add to inventory |
| 54 | Stock In | Cancel Stock In | Cancel import record |
| 55 | Stock In | Create Stock Return | Return goods from confirmed import |
| 56 | **Stock Return** | List Stock Returns | View return records (filter by code, stock in code, supplier) |
| 57 | Stock Return | View Stock Return Detail | View single return record details |
| 58 | Stock Return | Cancel Stock Return | Cancel return and restore inventory |
| 59 | **Suppliers** | List Suppliers | View all suppliers |
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
| 71 | **Customers** | List Customers | View all customers |
| 72 | **Member Policies** | List Member Policies | View all customer policies |
| 73 | Member Policies | Create Member Policy | Create new policy |
| 74 | Member Policies | Update Member Policy | Update policy |
| 75 | Member Policies | Delete Member Policy | Remove policy |
| 76 | **Store Profile** | View Store Profile | View store information |
| 77 | Store Profile | Update Store Profile | Update store information |
| 78 | **Cart** | View Cart | View cart items |
| 79 | Cart | Add to Cart | Add product to cart |
| 80 | Cart | Update Cart Item | Update item quantity |
| 81 | Cart | Remove from Cart | Remove item from cart |
| 82 | Cart | Clear Cart | Clear all cart items |
| 83 | **Orders** | Create Order | Create order from cart (checkout) |
| 84 | Orders | List My Orders | View user's order history |
| 85 | Orders | View Order Detail | View single order details |
| 86 | Orders | Update Order | Update order status (admin/manager) |
| 87 | **Roles** | List Roles | View all roles |
| 88 | Roles | List Permissions | View all permissions |
| 89 | Roles | Create Role | Create new role |
| 90 | Roles | Update Role | Update role |
| 91 | Roles | Delete Role | Remove role |
| 92 | **Activity Logs** | List Activity Logs | View activity logs (admin) |
| 93 | Activity Logs | List My Logs | View own activity logs |
| 94 | Activity Logs | Delete Activity Log | Remove activity log |
| 95 | **Profile** | View Profile | View own profile |
| 96 | Profile | Update Profile | Update own profile |

---

**Note:** Order and Cart routes exist in the backend but may not be mounted in `server.js`. Verify API configuration if checkout/orders features are not working.
