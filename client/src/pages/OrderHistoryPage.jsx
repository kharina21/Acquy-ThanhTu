import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { getMyOrders } from '@/services/orderService';
import { toast } from 'sonner';

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

export default function OrderHistoryPage() {
  const { user, accessToken, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    if (!accessToken) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await getMyOrders({ page: 1, limit: 20 });
        const data = res?.data;
        setOrders(data?.orders || []);
        setPagination(data?.pagination || { page: 1, totalPages: 1 });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi khi tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [accessToken]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công !');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất !');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Đơn hàng của tôi</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">Chưa có đơn hàng nào</p>
            <Link to="/home">
              <Button className="bg-blue-600 hover:bg-blue-700">Mua sắm ngay</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{order.code}</p>
                    <p className="text-sm text-gray-600">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        order.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className="font-bold text-red-600">
                      {order.totalAmount?.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
