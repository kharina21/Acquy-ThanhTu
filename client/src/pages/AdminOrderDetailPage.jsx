import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getOrderById, updateOrder } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
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

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const { isAdmin, isManager, hasAnyRole } = useUserRole();
  const canUpdate = isAdmin || isManager || hasAnyRole('Quản lý chi nhánh');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState(null);

  const fetchOrder = async () => {
    if (!id) return;
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

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (field, value) => {
    if (!order?._id || !canUpdate) return;
    setUpdating(true);
    try {
      await updateOrder(order._id, { [field]: value });
      toast.success('Cập nhật thành công');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <p className="text-base-content/60 mb-4">Không tìm thấy đơn hàng</p>
            <Link to="/admin/orders">
              <Button variant="outline">Quay lại</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-base-content">Đơn hàng {order.code}</h1>
              <Link to="/admin/orders">
                <Button variant="outline" size="sm">
                  Danh sách đơn
                </Button>
              </Link>
            </div>

            <div className="bg-base-100 rounded-xl shadow p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-base-content/60">Khách hàng</p>
                  <p className="font-medium">
                    {order.customer?.firstName || order.customer?.lastName
                      ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ')
                      : order.customer?.username || '—'}
                  </p>
                  <p className="text-sm">{order.customer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Địa chỉ giao hàng</p>
                  <p>{order.shippingAddress || '—'}</p>
                </div>
              </div>

              {canUpdate && (
                <div className="flex flex-wrap gap-4 pt-4 border-t border-base-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Trạng thái:</span>
                    <select
                      className="select select-bordered select-sm"
                      value={order.status}
                      disabled={updating}
                      onChange={(e) => handleUpdateStatus('status', e.target.value)}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Thanh toán:</span>
                    <select
                      className="select select-bordered select-sm"
                      value={order.paymentStatus}
                      disabled={updating}
                      onChange={(e) => handleUpdateStatus('paymentStatus', e.target.value)}
                    >
                      <option value="pending">Chờ thanh toán</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="failed">Thất bại</option>
                      <option value="refunded">Đã hoàn tiền</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-base-100 rounded-xl shadow overflow-hidden">
              <h2 className="px-6 py-4 font-semibold border-b border-base-200">Chi tiết sản phẩm</h2>
              <div className="divide-y divide-base-200">
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-6 py-4"
                  >
                    <div>
                      <p className="font-medium">{item.product?.name || 'Sản phẩm'}</p>
                      <p className="text-sm text-base-content/60">
                        {item.quantity} x {item.price?.toLocaleString()}đ
                      </p>
                    </div>
                    <p className="font-medium">{(item.quantity * item.price)?.toLocaleString()}đ</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-base-200 flex justify-between font-bold text-lg">
                <span>Tổng tiền</span>
                <span className="text-primary">{order.totalAmount?.toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
