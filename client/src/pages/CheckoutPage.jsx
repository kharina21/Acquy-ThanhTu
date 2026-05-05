import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { createOrder, generateVietQR, getCheckoutPreview } from '@/services/orderService';
import { getProvinces } from '@/services/addressService';
import { getShippingAddresses } from '@/services/shippingAddressService';
import { ShippingAddressBookDialog } from '@/components/checkout/ShippingAddressBookDialog';
import { AlertCircle, CheckCircle2, MapPin, Plus, ShoppingBag } from 'lucide-react';
import { PageState } from '@/components/ui/page-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { toast } from 'sonner';

const emptyShippingFields = () => ({
  recipientName: '',
  shippingPhone: '',
  provinceCode: '',
  provinceName: '',
  districtCode: '',
  districtName: '',
  wardCode: '',
  wardName: '',
  addressLine: '',
});

const normStr = (s) => String(s ?? '').trim();

/** Form đang khớp một dòng trong sổ địa chỉ (để hiển thị nhãn / mặc định). */
function savedAddressMatchesForm(addr, f) {
  if (!addr || !f) return false;
  return (
    normStr(addr.provinceCode) === normStr(f.provinceCode) &&
    normStr(addr.districtCode) === normStr(f.districtCode) &&
    normStr(addr.wardCode) === normStr(f.wardCode) &&
    normStr(addr.addressLine) === normStr(f.addressLine) &&
    normStr(addr.shippingPhone) === normStr(f.shippingPhone) &&
    normStr(addr.recipientName) === normStr(f.recipientName)
  );
}

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
  const { items, loadCartFromServer } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [provinces, setProvinces] = useState([]);
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
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [checkoutPreview, setCheckoutPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);

  const applySavedAddress = (addr) => {
    if (!addr) return;
    setForm((f) => ({
      ...f,
      recipientName: addr.recipientName,
      shippingPhone: addr.shippingPhone,
      provinceCode: String(addr.provinceCode),
      provinceName: addr.provinceName,
      districtCode: String(addr.districtCode),
      districtName: addr.districtName,
      wardCode: String(addr.wardCode),
      wardName: addr.wardName,
      addressLine: addr.addressLine,
    }));
  };

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await getShippingAddresses();
      const list = res?.data?.addresses ?? [];
      setSavedAddresses(list);
      const def = list.find((a) => a.isDefault);
      if (def) applySavedAddress(def);
      else if (list.length === 1) applySavedAddress(list[0]);
      else setForm((f) => ({ ...f, ...emptyShippingFields() }));
    } catch (e) {
      console.error(e);
      setSavedAddresses([]);
      setForm((f) => ({ ...f, ...emptyShippingFields() }));
    } finally {
      setAddressesLoading(false);
    }
  };

  const openAddressBook = () => {
    setAddressBookOpen(true);
  };

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
        await loadAddresses();
      } catch (e) {
        console.error(e);
        toast.error('Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [accessToken, navigate]);

  const checkoutPreviewKey = useMemo(
    () => items.map((i) => `${i.productId}:${i.selected !== false ? 1 : 0}`).join('|'),
    [items]
  );

  useEffect(() => {
    if (!accessToken || loading) return;
    if (items.length === 0) {
      setCheckoutPreview(null);
      return;
    }
    getCheckoutPreview()
      .then((res) => res?.data && setCheckoutPreview(res.data))
      .catch(() => setCheckoutPreview(null));
  }, [accessToken, loading, checkoutPreviewKey]);

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

    const selectedForOrder = items.filter((i) => i.selected !== false);
    if (items.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }
    if (selectedForOrder.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm trong giỏ để thanh toán');
      return;
    }

    if (savedAddresses.length === 0) {
      toast.error('Vui lòng thêm ít nhất một địa chỉ trong sổ địa chỉ giao hàng');
      return;
    }
    if (!hasValidShippingSelection) {
      toast.error('Vui lòng chọn địa chỉ giao hàng trong sổ địa chỉ');
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
        await loadCartFromServer();
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

  const matchedSavedForDisplay = useMemo(
    () => savedAddresses.find((a) => savedAddressMatchesForm(a, form)) ?? null,
    [savedAddresses, form],
  );

  const hasValidShippingSelection = useMemo(
    () =>
      Boolean(
        normStr(form.recipientName) &&
          normStr(form.shippingPhone) &&
          normStr(form.provinceCode) &&
          normStr(form.districtCode) &&
          normStr(form.wardCode) &&
          normStr(form.addressLine),
      ),
    [form],
  );

  const selectedItems = useMemo(
    () => items.filter((i) => i.selected !== false),
    [items]
  );
  const selectedSubtotalLocal = selectedItems.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );
  const preview = checkoutPreview;
  const subtotal = preview?.subtotal ?? selectedSubtotalLocal;
  const vatTotal = preview?.vatTotal ?? 0;
  const grossSubtotal = preview?.grossSubtotal ?? subtotal + vatTotal;
  const discount = preview?.discount ?? 0;
  const finalTotal = preview?.finalTotal ?? grossSubtotal;
  const tierName = preview?.tierName;
  const discountPercent = preview?.discountPercent ?? 0;

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-base-200/40 flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-base-content mb-1">Thanh toán</h1>
        <p className="text-sm text-base-content/60 mb-6">Kiểm tra địa chỉ và xác nhận đơn hàng</p>

        {loading ? (
          <PageState variant="loading" title="Đang tải thông tin..." />
        ) : orderSuccess ? (
          <div className="max-w-lg mx-auto space-y-5">
            <PageState
              variant="success"
              icon={CheckCircle2}
              title="Đặt hàng thành công!"
              description="Hoàn tất thanh toán qua PayOS để cửa hàng xử lý đơn nhanh hơn."
            >
              {orderSuccess.order?.code ? (
                <p className="text-sm text-base-content/70 mb-4 font-mono bg-base-200/50 rounded-xl py-2 px-3 inline-block">
                  Mã đơn: <span className="font-semibold text-base-content">{orderSuccess.order.code}</span>
                  {orderSuccess.order?.totalAmount != null ? (
                    <span className="text-base-content/60">
                      {' '}
                      · Tổng {Number(orderSuccess.order.totalAmount).toLocaleString('vi-VN')}đ
                    </span>
                  ) : null}
                </p>
              ) : null}
            </PageState>

            <SurfaceCard className="p-6">
              <h2 className="font-semibold text-base-content mb-1">Thanh toán chuyển khoản</h2>
              <p className="text-sm text-base-content/60 mb-4">Cổng PayOS — an toàn, có xác nhận tức thì.</p>
              {orderSuccess.checkoutUrl ? (
                <Button asChild size="lg" className="w-full rounded-xl">
                  <a href={orderSuccess.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    Thanh toán qua PayOS
                  </a>
                </Button>
              ) : (
                <p className="text-base-content/70 text-sm">Vui lòng xem chi tiết đơn hàng để thanh toán.</p>
              )}
            </SurfaceCard>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={orderSuccess.orderId ? `/orders/${orderSuccess.orderId}` : '/orders'} className="flex-1">
                <Button variant="outline" className="w-full rounded-xl">
                  Xem đơn hàng
                </Button>
              </Link>
              <Link to="/home" className="flex-1">
                <Button className="w-full rounded-xl">Tiếp tục mua sắm</Button>
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <PageState
            variant="empty"
            icon={ShoppingBag}
            title="Giỏ hàng trống"
            description="Thêm sản phẩm vào giỏ trước khi thanh toán."
          >
            <Link to="/cart">
              <Button variant="outline" className="rounded-xl">
                Quay lại giỏ hàng
              </Button>
            </Link>
          </PageState>
        ) : selectedItems.length === 0 ? (
          <PageState
            variant="warning"
            icon={AlertCircle}
            title="Chưa chọn sản phẩm để thanh toán"
            description="Vào giỏ hàng và chọn các mục bạn muốn mua, hoặc bỏ chọn những mục chỉ để xem sau."
          >
            <Link to="/cart">
              <Button className="rounded-xl">Quay lại giỏ hàng</Button>
            </Link>
          </PageState>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="flex-1 max-w-xl space-y-6">
              <SurfaceCard className="p-6">
                <h2 className="font-semibold text-base-content mb-4">Địa chỉ giao hàng</h2>

                {addressesLoading ? (
                  <p className="text-sm text-base-content/55 py-4">Đang tải địa chỉ...</p>
                ) : savedAddresses.length > 0 ? (
                  <button
                    type="button"
                    onClick={openAddressBook}
                    className="w-full text-left rounded-xl border border-base-200 bg-base-200/40 p-4 transition-colors hover:border-primary/35 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <div className="flex gap-3 items-start">
                      <MapPin className="w-5 h-5 shrink-0 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-base-content">
                            {matchedSavedForDisplay?.label?.trim() || 'Địa chỉ giao hàng'}
                          </span>
                          {matchedSavedForDisplay?.isDefault === true || matchedSavedForDisplay?.isDefault === 'true' ? (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Mặc định
                            </span>
                          ) : matchedSavedForDisplay ? (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              Đã chọn
                            </span>
                          ) : hasValidShippingSelection ? (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-base-200 text-base-content/80">
                              Đang dùng
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium text-base-content">{form.recipientName || '—'}</p>
                        <p className="text-sm text-base-content/70">{form.shippingPhone || '—'}</p>
                        <p className="text-sm text-base-content/70 leading-relaxed">
                          {[
                            form.addressLine,
                            form.wardName,
                            form.districtName,
                            form.provinceName,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium shrink-0 pt-1">Sổ địa chỉ</span>
                    </div>
                    <p className="text-xs text-base-content/55 mt-3">
                      Địa chỉ mặc định chỉ tự điền lúc vào trang; nhấn vào thẻ trong sổ để chọn giao đến địa chỉ khác cho đơn này.
                    </p>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openAddressBook}
                    className="w-full rounded-xl border border-dashed border-warning/40 bg-warning/8 p-6 text-center transition-colors hover:bg-warning/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning/35"
                  >
                    <p className="text-warning-content font-medium mb-1">Chưa có địa chỉ đã lưu</p>
                    <p className="text-sm text-base-content/75 mb-4">Nhấn để thêm địa chỉ vào sổ rồi chọn địa chỉ giao hàng.</p>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
                      <Plus className="w-4 h-4" />
                      Mở sổ địa chỉ
                    </span>
                  </button>
                )}
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <h2 className="font-semibold text-base-content mb-2">Hình thức thanh toán</h2>
                <p className="text-sm text-base-content/65">
                  Mua online: chuyển khoản qua PayOS. Sau khi đặt hàng, nhấn nút thanh toán để hoàn tất.
                </p>
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <h2 className="font-semibold text-base-content mb-3">Ghi chú</h2>
                <textarea
                  className={`w-full px-4 py-3 border border-base-300 bg-base-100 rounded-xl min-h-[60px] focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${errors.note ? 'border-error' : ''}`}
                  placeholder="Ghi chú cho đơn hàng (tùy chọn, tối đa 500 ký tự)"
                  value={form.note}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, note: e.target.value }));
                    if (errors.note) setErrors((er) => ({ ...er, note: null }));
                  }}
                />
                {errors.note && <p className="text-xs text-error mt-1">{errors.note}</p>}
              </SurfaceCard>

              <SurfaceCard className="p-5 lg:hidden bg-base-200/30 border-base-200/80">
                <div className="flex justify-between text-lg font-bold text-base-content mb-4">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary">{finalTotal.toLocaleString()}đ</span>
                </div>
                <div className="flex gap-2">
                  <Link to="/cart" className="flex-1">
                    <Button type="button" variant="outline" className="w-full rounded-xl">
                      Quay lại giỏ hàng
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={submitting || savedAddresses.length === 0 || !hasValidShippingSelection}
                    className="flex-1 rounded-xl"
                  >
                    {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                  </Button>
                </div>
              </SurfaceCard>
            </form>

            <div className="lg:w-[380px] shrink-0">
              <SurfaceCard className="p-6 sticky top-4">
                {tierName && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-warning/10 border border-warning/25">
                    <p className="text-xs text-warning-content font-medium">Hạng thành viên</p>
                    <p className="text-sm font-semibold text-base-content">{tierName}</p>
                    {discountPercent > 0 && (
                      <p className="text-xs text-success mt-0.5">Giảm {discountPercent}% cho đơn này</p>
                    )}
                  </div>
                )}
                {!tierName && selectedItems.length > 0 && (
                  <div className="mb-4 px-3 py-2 rounded-xl bg-base-200/60 border border-base-200">
                    <p className="text-xs text-base-content/70">Hạng thành viên: chưa có hạng</p>
                    <p className="text-xs text-base-content/55 mt-0.5">Mua thêm để tích lũy và nhận ưu đãi</p>
                  </div>
                )}
                <h2 className="font-semibold text-base-content mb-4">Sản phẩm đặt mua</h2>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedItems.map((item) => {
                    const lineSub = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                    return (
                      <div
                        key={item.productId}
                        className="flex gap-3 py-3 border-b border-base-200 last:border-0 last:pb-0"
                      >
                        <div className="w-14 h-14 bg-base-200/80 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-base-200/80">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-base-content/40 text-xs">N/A</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base-content text-sm line-clamp-2">{item.name}</h3>
                          <p className="text-base-content/55 text-xs mt-0.5">
                            {(item.price || 0).toLocaleString()}đ × {item.quantity || 1}
                          </p>
                          <p className="text-primary font-semibold text-sm mt-1">{lineSub.toLocaleString()}đ</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-base-200 space-y-2">
                  <div className="flex justify-between text-sm text-base-content/70">
                    <span>Tiền hàng (chưa thuế):</span>
                    <span>{subtotal.toLocaleString()}đ</span>
                  </div>
                  {vatTotal > 0 && (
                    <div className="flex justify-between text-sm text-base-content/70">
                      <span>Thuế GTGT:</span>
                      <span>{vatTotal.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-base-content/55">
                    <span>Cộng (gồm thuế, trước chiết khấu hạng):</span>
                    <span>{grossSubtotal.toLocaleString()}đ</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Chiết khấu ({discountPercent}%):</span>
                      <span>-{discount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-base-content pt-2">
                    <span>Tổng thanh toán:</span>
                    <span className="text-primary">{finalTotal.toLocaleString()}đ</span>
                  </div>
                  <div className="hidden lg:flex gap-2 mt-4">
                    <Link to="/cart">
                      <Button type="button" variant="outline" className="flex-1 rounded-xl">
                        Quay lại giỏ hàng
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      form="checkout-form"
                      disabled={submitting || savedAddresses.length === 0 || !hasValidShippingSelection}
                      className="flex-1 rounded-xl"
                    >
                      {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                    </Button>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        )}
      </main>

      <ShippingAddressBookDialog
        open={addressBookOpen}
        onOpenChange={setAddressBookOpen}
        provinces={provinces}
        pickForOrder
        onPickAddress={(addr) => {
          applySavedAddress(addr);
          toast.success('Đã chọn địa chỉ giao hàng cho đơn này');
        }}
        onAddressesChange={(list) => {
          setSavedAddresses(list);
        }}
      />

      <Footer />
    </div>
  );
}
