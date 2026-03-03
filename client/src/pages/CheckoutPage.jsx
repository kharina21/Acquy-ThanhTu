import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { createOrder } from '@/services/orderService';
import { getActiveLocations } from '@/services/locationService';
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
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    locationId: '',
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
        const locRes = await getActiveLocations();
        const locs = locRes?.data?.locations || [];
        setLocations(locs);
        if (locs.length > 0 && !form.locationId) {
          setForm((f) => ({ ...f, locationId: locs[0]._id }));
        }
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
    if (!form.locationId) {
      toast.error('Vui lòng chọn chi nhánh');
      return;
    }
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
        locationId: form.locationId,
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
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-800 mb-3">Chi nhánh nhận hàng</h2>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={form.locationId}
                onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                required
              >
                <option value="">-- Chọn chi nhánh --</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name} - {loc.address || loc.code}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
        )}
      </main>

      <Footer />
    </div>
  );
}
