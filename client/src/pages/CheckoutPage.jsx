import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/services/orderService';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'vietqr', label: 'VietQR (Quét mã)' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuthStore();
  const { items, loadCartFromServer, clearCartServer, setItemsFromServer } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    paymentMethod: 'transfer',
    shippingAddress: '',
    note: '',
  });

  useEffect(() => {
    if (!accessToken) {
      navigate('/login?redirect=/checkout', { replace: true });
      return;
    }
    const init = async () => {
      setLoading(true);
      try {
        await loadCartFromServer();
      } catch (e) {
        console.error(e);
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [accessToken]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công !');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất !');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shippingAddress?.trim()) {
      toast.error('Vui lòng nhập địa chỉ giao hàng');
      return;
    }
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrder({
        paymentMethod: form.paymentMethod,
        shippingAddress: form.shippingAddress.trim(),
        note: form.note.trim(),
      });
      const order = res?.data?.order;
      if (order) {
        await clearCartServer();
        setItemsFromServer([]);
        toast.success('Đặt hàng thành công!');
        navigate(`/orders/${order._id}`, { replace: true });
      } else {
        toast.error(res?.message || 'Đặt hàng thất bại');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Thanh toán</h1>

        {loading ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">Giỏ hàng trống</p>
            <Link to="/cart">
              <Button variant="outline">Quay lại giỏ hàng</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 max-w-xl space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Địa chỉ giao hàng</h2>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  placeholder="Nhập địa chỉ giao hàng"
                  value={form.shippingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                  required
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Hình thức thanh toán</h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <label key={pm.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.value}
                        checked={form.paymentMethod === pm.value}
                        onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                      />
                      <span>{pm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Ghi chú</h2>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[60px]"
                  placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 lg:hidden">
                <div className="flex justify-between text-lg font-bold text-gray-800 mb-4">
                  <span>Tổng tiền:</span>
                  <span className="text-red-600">{total.toLocaleString()}đ</span>
                </div>
                <div className="flex gap-2">
                  <Link to="/cart">
                    <Button type="button" variant="outline">
                      Quay lại giỏ hàng
                    </Button>
                  </Link>
                  <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                    {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="lg:w-[380px] shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
                <h2 className="font-semibold text-gray-800 mb-4">Sản phẩm đặt mua</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {items.map((item) => {
                    const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                    return (
                      <div
                        key={item.productId}
                        className="flex gap-3 py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-800 text-sm line-clamp-2">{item.name}</h3>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {(item.price || 0).toLocaleString()}đ × {item.quantity || 1}
                          </p>
                          <p className="text-red-600 font-semibold text-sm mt-1">
                            {subtotal.toLocaleString()}đ
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-bold text-gray-800">
                    <span>Tổng tiền:</span>
                    <span className="text-red-600">{total.toLocaleString()}đ</span>
                  </div>
                  <div className="flex gap-2 mt-4 hidden lg:flex">
                    <Link to="/cart">
                      <Button type="button" variant="outline" className="flex-1">
                        Quay lại giỏ hàng
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      form="checkout-form"
                      disabled={submitting}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
