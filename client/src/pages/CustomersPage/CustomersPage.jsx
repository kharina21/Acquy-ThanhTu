import Header from '../UserManagementPage/Header';

/**
 * Trang quản lý khách hàng (danh sách khách hàng).
 * Khác với "Chính sách khách hàng" (member policies) – trang này dùng để xem/sửa danh sách khách hàng và hạng của họ.
 */
const CustomersPage = () => {
    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <Header title="Khách hàng" />
                <div className="bg-base-100 rounded-lg shadow p-8 text-center text-base-content/70">
                    <p className="font-medium">Trang quản lý khách hàng</p>
                    <p className="text-sm mt-2">Nội dung đang được cập nhật.</p>
                </div>
            </div>
        </div>
    );
};

export default CustomersPage;
