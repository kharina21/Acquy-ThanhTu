import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { createOrder, generateVietQR, getCheckoutPreview } from '@/services/orderService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { toast } from 'sonner';

// Validate tên người nhận: 2–100 ký tự, chữ và dấu cách, không số
const validateRecipientName = (name) => {
  const s = (name || '').trim();
  if (!s) return 'Vui lòng nhập tên người nhận';
  if (s.length < 2) return 'Tên người nhận phải có ít nhất 2 ký tự';
  if (s.length > 100) return 'Tên người nhận không quá 100 ký tự';
  if (!/^[\p{L}\s.'-]+$/u.test(s)) return 'Tên chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
  return null;
};

// Validate SĐT Việt Nam: 10–11 số, bắt đầu 03/05/07/08/09/02
const validatePhone = (phone) => {
  const s = (phone || '').trim().replace(/\s/g, '');
  if (!s) return 'Vui lòng nhập số điện thoại nhận hàng';
  if (!/^0[2-9][0-9]{8,9}$/.test(s)) return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
  return null;
};

// Validate địa chỉ: ít nhất 10 ký tự, tối đa 200
const validateAddressLine = (addr) => {
  const s = (addr || '').trim();
  if (!s) return 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)';
  if (s.length < 10) return 'Địa chỉ phải có ít nhất 10 ký tự';
  if (s.length > 200) return 'Địa chỉ không quá 200 ký tự';
  return null;
};

// Validate ghi chú: tối đa 500 ký tự (nếu có nhập)
const validateNote = (note) => {
  const s = (note || '').trim();
  if (s.length > 500) return 'Ghi chú không quá 500 ký tự';
  return null;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuthStore();
  const { items, loadCartFromServer, clearCartServer, setItemsFromServer } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [form, setForm] = useState({
    paymentMethod: 'transfer',
    recipientName: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    addressLine: '',
    shippingPhone: '',
    note: '',
  });
  const [orderSuccess, setOrderSuccess] = useState(null); // { order, qrDataURL, bankAccount, checkoutUrl }
  const [checkoutPreview, setCheckoutPreview] = useState(null); // { tierName, discountPercent, discount, subtotal, finalTotal }
  const [errors, setErrors] = useState({}); // { recipientName?, shippingPhone?, addressLine?, provinceCode?, districtCode?, wardCode?, note? }

  useEffect(() => {
    if (!accessToken) {
      navigate('/login?redirect=/checkout', { replace: true });
      return;
    }
    const init = async () => {
      setLoading(true);
      try {
        await loadCartFromServer();
        getProvinces().then(setProvinces).catch(() => setProvinces([]));
        getCheckoutPreview()
          .then((res) => res?.data && setCheckoutPreview(res.data))
          .catch(() => setCheckoutPreview(null));
      } catch (e) {
        console.error(e);
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [accessToken, navigate]);

  useEffect(() => {
    if (!form.provinceCode) {
      setDistricts([]);
      setWards([]);
      return;
    }
    getDistricts(form.provinceCode).then(setDistricts).catch(() => setDistricts([]));
    setForm((f) => ({ ...f, districtCode: '', districtName: '', wardCode: '', wardName: '' }));
  }, [form.provinceCode]);

  useEffect(() => {
    if (!form.districtCode) {
      setWards([]);
      return;
    }
    getWards(form.districtCode).then(setWards).catch(() => setWards([]));
    setForm((f) => ({ ...f, wardCode: '', wardName: '' }));
  }, [form.districtCode]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công !');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất !');
    }
  };

  const buildShippingAddress = () => {
    const parts = [
      form.addressLine?.trim(),
      form.wardName,
      form.districtName,
      form.provinceName,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    const recipientName = form.recipientName?.trim();
    const shippingPhone = form.shippingPhone?.trim();
    const addressLine = form.addressLine?.trim();

    const errRecipient = validateRecipientName(recipientName);
    const errPhone = validatePhone(shippingPhone);
    const errAddress = validateAddressLine(addressLine);
    const errProvince = !form.provinceCode ? 'Vui lòng chọn Tỉnh/Thành phố' : null;
    const errDistrict = !form.districtCode ? 'Vui lòng chọn Quận/Huyện' : null;
    const errWard = !form.wardCode ? 'Vui lòng chọn Phường/Xã' : null;
    const errNote = validateNote(form.note);

    const newErrors = {
      recipientName: errRecipient,
      shippingPhone: errPhone,
      addressLine: errAddress,
      provinceCode: errProvince,
      districtCode: errDistrict,
      wardCode: errWard,
      note: errNote,
    };
    setErrors(newErrors);

    const hasError = errRecipient || errPhone || errAddress || errProvince || errDistrict || errWard || errNote;
    if (hasError) {
      toast.error('Vui lòng kiểm tra và sửa thông tin chưa hợp lệ');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrder({
        paymentMethod: form.paymentMethod,
        recipientName,
        shippingAddress: buildShippingAddress(),
        shippingPhone,
        provinceCode: form.provinceCode,
        provinceName: form.provinceName,
        districtCode: form.districtCode,
        districtName: form.districtName,
        wardCode: form.wardCode,
        wardName: form.wardName,
        addressLine: form.addressLine?.trim(),
        note: form.note.trim(),
      });
      const order = res?.data?.order;
      if (order) {
        await clearCartServer();
        setItemsFromServer([]);
        toast.success('Đặt hàng thành công! Vui lòng chuyển khoản theo thông tin bên dưới.');
        try {
          const qrRes = await generateVietQR(order._id);
          const qrData = qrRes?.data;
          setOrderSuccess({
            orderId: order._id,
            order: qrData?.order || { code: order.code, totalAmount: order.totalAmount },
            qrDataURL: qrData?.qrDataURL,
            bankAccount: qrData?.bankAccount,
            checkoutUrl: qrData?.checkoutUrl,
          });
        } catch (qrErr) {
          setOrderSuccess({
            orderId: order._id,
            order: { code: order.code, totalAmount: order.totalAmount },
            qrDataURL: null,
            bankAccount: null,
          });
          toast.warning(qrErr.response?.data?.message || 'Không tạo được mã QR. Vui lòng xem thông tin chuyển khoản tại trang chi tiết đơn hàng.');
        }
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
  const preview = checkoutPreview;
  const subtotal = preview?.subtotal ?? total;
  const discount = preview?.discount ?? 0;
  const finalTotal = preview?.finalTotal ?? total;
  const tierName = preview?.tierName;
  const discountPercent = preview?.discountPercent ?? 0;

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Thanh toán</h1>

        {loading ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : orderSuccess ? (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-sm border border-emerald-100 p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-emerald-800 text-lg">Đặt hàng thành công!</p>
              <p className="text-sm text-emerald-700 mt-1">Nhấn nút bên dưới để thanh toán qua PayOS.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Thanh toán chuyển khoản</h2>
              {orderSuccess.checkoutUrl ? (
                <Button asChild size="lg" className="w-full">
                  <a
                    href={orderSuccess.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Thanh toán qua PayOS
                  </a>
                </Button>
              ) : (
                <p className="text-gray-600">Vui lòng xem chi tiết đơn hàng để thanh toán.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Link to={orderSuccess.orderId ? `/orders/${orderSuccess.orderId}` : '/orders'} className="flex-1">
                <Button variant="outline" className="w-full">
                  Xem đơn hàng
                </Button>
              </Link>
              <Link to="/home" className="flex-1">
                <Button className="w-full">Tiếp tục mua sắm</Button>
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-600 mb-4">Giỏ hàng trống</p>
            <Link to="/cart">
              <Button variant="outline">Quay lại giỏ hàng</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 max-w-xl space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Địa chỉ giao hàng</h2>
                <div className="space-y-3">
                  <div>
                    <label className="label py-0 text-xs">Tên người nhận</label>
                    <input
                      type="text"
                      className={`input input-bordered input-sm w-full ${errors.recipientName ? 'input-error' : ''}`}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={form.recipientName}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, recipientName: e.target.value }));
                        if (errors.recipientName) setErrors((e) => ({ ...e, recipientName: null }));
                      }}
                      required
                    />
                    {errors.recipientName && <p className="text-xs text-red-600 mt-1">{errors.recipientName}</p>}
                  </div>
                  <div>
                    <label className="label py-0 text-xs">Tỉnh / Thành phố</label>
                    <select
                      className={`select select-bordered select-sm w-full ${errors.provinceCode ? 'select-error' : ''}`}
                      value={form.provinceCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const p = provinces.find((x) => String(x.code) === code);
                        setForm((f) => ({
                          ...f,
                          provinceCode: code,
                          provinceName: p?.name || '',
                        }));
                        if (errors.provinceCode) setErrors((er) => ({ ...er, provinceCode: null }));
                      }}
                      required
                    >
                      <option value="">— Chọn Tỉnh/Thành phố —</option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.provinceCode && <p className="text-xs text-red-600 mt-1">{errors.provinceCode}</p>}
                  </div>
                  <div>
                    <label className="label py-0 text-xs">Quận / Huyện</label>
                    <select
                      className={`select select-bordered select-sm w-full ${errors.districtCode ? 'select-error' : ''}`}
                      value={form.districtCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const d = districts.find((x) => String(x.code) === code);
                        setForm((f) => ({
                          ...f,
                          districtCode: code,
                          districtName: d?.name || '',
                        }));
                        if (errors.districtCode) setErrors((er) => ({ ...er, districtCode: null }));
                      }}
                      required
                      disabled={!form.provinceCode}
                    >
                      <option value="">— Chọn Quận/Huyện —</option>
                      {districts.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.districtCode && <p className="text-xs text-red-600 mt-1">{errors.districtCode}</p>}
                  </div>
                  <div>
                    <label className="label py-0 text-xs">Phường / Xã / Thị trấn</label>
                    <select
                      className={`select select-bordered select-sm w-full ${errors.wardCode ? 'select-error' : ''}`}
                      value={form.wardCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const w = wards.find((x) => String(x.code) === code);
                        setForm((f) => ({
                          ...f,
                          wardCode: code,
                          wardName: w?.name || '',
                        }));
                        if (errors.wardCode) setErrors((er) => ({ ...er, wardCode: null }));
                      }}
                      required
                      disabled={!form.districtCode}
                    >
                      <option value="">— Chọn Phường/Xã/Thị trấn —</option>
                      {wards.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    {errors.wardCode && <p className="text-xs text-red-600 mt-1">{errors.wardCode}</p>}
                  </div>
                  <div>
                    <label className="label py-0 text-xs">Địa chỉ cụ thể (số nhà, tên đường...)</label>
                    <input
                      type="text"
                      className={`input input-bordered input-sm w-full ${errors.addressLine ? 'input-error' : ''}`}
                      placeholder="Ví dụ: Số 123, đường ABC, phường 1"
                      value={form.addressLine}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, addressLine: e.target.value }));
                        if (errors.addressLine) setErrors((er) => ({ ...er, addressLine: null }));
                      }}
                      required
                    />
                    {errors.addressLine && <p className="text-xs text-red-600 mt-1">{errors.addressLine}</p>}
                  </div>
                  <div>
                    <label className="label py-0 text-xs">Số điện thoại nhận hàng</label>
                    <input
                      type="tel"
                      className={`input input-bordered input-sm w-full ${errors.shippingPhone ? 'input-error' : ''}`}
                      placeholder="Ví dụ: 0901234567"
                      value={form.shippingPhone}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, shippingPhone: e.target.value }));
                        if (errors.shippingPhone) setErrors((er) => ({ ...er, shippingPhone: null }));
                      }}
                      required
                    />
                    {errors.shippingPhone && <p className="text-xs text-red-600 mt-1">{errors.shippingPhone}</p>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-2">Hình thức thanh toán</h2>
                <p className="text-sm text-gray-600">Mua online: Chuyển khoản qua PayOS. Sau khi đặt hàng, nhấn nút thanh toán để hoàn tất.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-3">Ghi chú</h2>
                <textarea
                  className={`w-full px-4 py-3 border rounded-xl min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.note ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Ghi chú cho đơn hàng (tùy chọn, tối đa 500 ký tự)"
                  value={form.note}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, note: e.target.value }));
                    if (errors.note) setErrors((er) => ({ ...er, note: null }));
                  }}
                />
                {errors.note && <p className="text-xs text-red-600 mt-1">{errors.note}</p>}
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 lg:hidden">
                <div className="flex justify-between text-lg font-bold text-gray-800 mb-4">
                  <span>Tổng thanh toán:</span>
                  <span className="text-blue-600">{finalTotal.toLocaleString()}đ</span>
                </div>
                <div className="flex gap-2">
                  <Link to="/cart" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Quay lại giỏ hàng
                    </Button>
                  </Link>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="lg:w-[380px] shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
                {tierName && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-700 font-medium">Hạng thành viên</p>
                    <p className="text-sm font-semibold text-amber-800">{tierName}</p>
                    {discountPercent > 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">Giảm {discountPercent}% cho đơn này</p>
                    )}
                  </div>
                )}
                {!tierName && items.length > 0 && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs text-gray-600">Hạng thành viên: Chưa có hạng</p>
                    <p className="text-xs text-gray-500 mt-0.5">Mua thêm để tích lũy và nhận ưu đãi</p>
                  </div>
                )}
                <h2 className="font-semibold text-gray-800 mb-4">Sản phẩm đặt mua</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {items.map((item) => {
                    const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                    return (
                      <div
                        key={item.productId}
                        className="flex gap-3 py-3 border-b border-gray-100 last:border-0 last:pb-0"
                      >
                        <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
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
                          <p className="text-blue-600 font-semibold text-sm mt-1">
                            {subtotal.toLocaleString()}đ
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tạm tính:</span>
                    <span>{subtotal.toLocaleString()}đ</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Chiết khấu ({discountPercent}%):</span>
                      <span>-{discount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-2">
                    <span>Tổng thanh toán:</span>
                    <span className="text-blue-600">{finalTotal.toLocaleString()}đ</span>
                  </div>
                  <div className="hidden lg:flex gap-2 mt-4">
                    <Link to="/cart">
                      <Button type="button" variant="outline" className="flex-1">
                        Quay lại giỏ hàng
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      form="checkout-form"
                      disabled={submitting}
                      className="flex-1"
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
