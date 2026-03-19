import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadge';
import { getMyOrders } from '@/services/orderService';
import { toast } from 'sonner';

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
          <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-600 mb-4">Chưa có đơn hàng nào</p>
            <Link to="/home">
              <Button>Mua sắm ngay</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const firstImg = order.items?.[0]?.product?.images?.[0] || order.items?.[0]?.product?.image;
              return (
                <Link
                  key={order._id}
                  to={`/orders/${order._id}`}
                  className="block p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                  <div className="flex gap-4 sm:items-center">
                    {firstImg && (
                      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img src={firstImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">{order.code}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Ngày đặt: {order.createdAt
                            ? new Date(order.createdAt).toLocaleString('vi-VN')
                            : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <OrderStatusBadge status={order.status} />
                        <PaymentStatusBadge status={order.paymentStatus} />
                        <span className="font-bold text-blue-600">
                          {order.totalAmount?.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
