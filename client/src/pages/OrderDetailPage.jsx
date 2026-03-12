import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { getOrderById } from '@/services/orderService';
import { toast } from 'sonner';

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user, accessToken, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!id || !accessToken) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await getOrderById(id);
        setOrder(res?.data?.order);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Không tìm thấy đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, accessToken]);

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
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Không tìm thấy đơn hàng</p>
            <Link to="/orders">
              <Button variant="outline">Quay lại danh sách đơn</Button>
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">Đơn hàng {order.code}</h1>
              <Link to="/orders">
                <Button variant="outline" size="sm">
                  Danh sách đơn
                </Button>
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              <p>
                <span className="text-gray-600">Trạng thái:</span>{' '}
                <span className="font-medium">{STATUS_LABELS[order.status] || order.status}</span>
              </p>
              <p>
                <span className="text-gray-600">Thanh toán:</span>{' '}
                <span className="font-medium">
                  {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Địa chỉ giao hàng:</span> {order.shippingAddress || '—'}
              </p>
              {order.note && (
                <p>
                  <span className="text-gray-600">Ghi chú:</span> {order.note}
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Chi tiết sản phẩm</h2>
              <div className="divide-y">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-3">
                    <div>
                      <p className="font-medium">{item.product?.name || 'Sản phẩm'}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} x {item.price?.toLocaleString()}đ
                      </p>
                    </div>
                    <p className="font-medium">{(item.quantity * item.price)?.toLocaleString()}đ</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex justify-between font-bold text-lg">
                <span>Tổng tiền</span>
                <span className="text-red-600">{order.totalAmount?.toLocaleString()}đ</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link to="/home">
                <Button>Tiếp tục mua sắm</Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
