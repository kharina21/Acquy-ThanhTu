/**
 * Layout dành riêng cho trang Bán hàng - full màn hình, không sidebar.
 * Mở trong tab mới, không có nút quay lại.
 * Thông tin tài khoản hiển thị trong header của CreateInvoicePage (cùng hàng với tìm kiếm).
 */
export default function SalesLayout({ children }) {
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-base-200">
            <div className="flex-1 flex flex-col min-h-0">
                {children}
            </div>
        </div>
    );
}
