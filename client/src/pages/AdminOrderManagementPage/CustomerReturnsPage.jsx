import AdminOrderManagementPage from './AdminOrderManagementPage';

/** Trả hàng — đơn hủy đã thanh toán (chờ hoàn) & đơn đã hoàn tiền (dùng chung bảng quản lý đơn). */
export default function CustomerReturnsPage() {
    return <AdminOrderManagementPage type='returns' />;
}
