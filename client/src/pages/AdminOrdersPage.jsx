import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getMyOrders } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: '', paymentStatus: '' });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (filters.status) params.status = filters.status;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      const res = await getMyOrders(params);
      const data = res?.data;
      setOrders(data?.orders || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.paymentStatus]);

  return (
    <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-base-content mb-6">Quản lý đơn hàng</h1>

        <div className="flex flex-wrap gap-4 mb-4">
          <select
            className="select select-bordered select-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="paid">Đã thanh toán</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select
            className="select select-bordered select-sm"
            value={filters.paymentStatus}
            onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
          >
            <option value="">Tất cả thanh toán</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="failed">Thất bại</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-base-100 rounded-lg p-12 text-center text-base-content/60">
            Chưa có đơn hàng nào
          </div>
        ) : (
          <div className="bg-base-100 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Trạng thái</th>
                    <th>Thanh toán</th>
                    <th className="text-right">Tổng tiền</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td className="font-medium">{order.code}</td>
                      <td>
                        <div className="text-sm">
                          {order.customer?.firstName || order.customer?.lastName
                            ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ')
                            : order.customer?.username || '—'}
                        </div>
                        <div className="text-xs text-base-content/60">{order.customer?.email}</div>
                      </td>
                      <td className="text-sm">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            order.status === 'paid'
                              ? 'badge-success'
                              : order.status === 'cancelled'
                                ? 'badge-error'
                                : 'badge-warning'
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            order.paymentStatus === 'paid'
                              ? 'badge-success'
                              : order.paymentStatus === 'failed'
                                ? 'badge-error'
                                : 'badge-ghost'
                          }`}
                        >
                          {order.paymentStatus === 'paid'
                            ? 'Đã TT'
                            : order.paymentStatus === 'pending'
                              ? 'Chờ TT'
                              : order.paymentStatus}
                        </span>
                      </td>
                      <td className="text-right font-medium">
                        {order.totalAmount?.toLocaleString()}đ
                      </td>
                      <td>
                        <Link to={`/admin/orders/${order._id}`}>
                          <Button variant="ghost" size="sm">
                            Chi tiết
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
