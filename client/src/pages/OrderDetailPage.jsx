import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadge';
import { getOrderById, generateVietQR, updateOrderByCustomer, cancelOrderByCustomer, syncPaymentStatus } from '@/services/orderService';
import { getProvinces } from '@/services/addressService';
import { ShippingAddressBookDialog } from '@/components/checkout/ShippingAddressBookDialog';
import { toast } from 'sonner';
import { CreditCard, MapPin, PackageX, RefreshCw, XCircle } from 'lucide-react';
import CancelOrderModal from '@/components/common/CancelOrderModal';
import { PageState } from '@/components/ui/page-state';
import { SurfaceCard } from '@/components/ui/surface-card';

/** Đơn cần hiển thị khu vực thanh toán (chuyển khoản / PayOS). */
function shouldLoadPaymentQr(ord) {
    if (!ord || ord.paymentStatus !== 'pending' || ord.status === 'cancelled') return false;
    if (ord.channel === 'online') return true;
    return ord.paymentMethod === 'transfer' || ord.paymentMethod === 'vietqr';
}

export default function OrderDetailPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const paymentReturn = searchParams.get('payment');
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [vietQRData, setVietQRData] = useState(null);
    const [paymentQrError, setPaymentQrError] = useState(null);
    const [syncingPayment, setSyncingPayment] = useState(false);
    const [loadingPaymentQr, setLoadingPaymentQr] = useState(false);
    const [provinces, setProvinces] = useState([]);
    const [addressBookOpen, setAddressBookOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [buyAgainLoading, setBuyAgainLoading] = useState(false);
    const navigate = useNavigate();
    const addToCartServer = useCartStore((s) => s.addToCartServer);
    const loadCartFromServer = useCartStore((s) => s.loadCartFromServer);

    const canEdit = order && order.status !== 'cancelled' && order.paymentStatus === 'pending';
    const canCancel = order && order.status !== 'cancelled' && order.status === 'pending';
    const showPaymentSection = order && shouldLoadPaymentQr(order);

    const fetchPaymentQrForOrder = useCallback(
        async (ord, isCancelled) => {
            if (!id || !shouldLoadPaymentQr(ord)) {
                if (!isCancelled?.()) {
                    setVietQRData(null);
                    setPaymentQrError(null);
                }
                return;
            }
            if (!isCancelled?.()) {
                setLoadingPaymentQr(true);
                setPaymentQrError(null);
            }
            try {
                const qrRes = await generateVietQR(id);
                if (isCancelled?.()) return;
                const qrData = qrRes?.data;
                const next = {
                    qrDataURL: qrData?.qrDataURL,
                    bankAccount: qrData?.bankAccount,
                    checkoutUrl: qrData?.checkoutUrl,
                };
                setVietQRData(next);
                if (!next.checkoutUrl && !next.qrDataURL) {
                    setPaymentQrError('Máy chủ không trả về mã thanh toán. Vui lòng thử lại sau.');
                }
            } catch (err) {
                if (!isCancelled?.()) {
                    setVietQRData(null);
                    setPaymentQrError(err?.response?.data?.message || 'Không tải được thông tin thanh toán.');
                }
            } finally {
                if (!isCancelled?.()) setLoadingPaymentQr(false);
            }
        },
        [id]
    );

    /**
     * Không xóa ?payment=success trước khi sync xong: effect trước đây clear query ngay
     * khiến effect tải đơn chạy lại với getOrderById và ghi đè kết quả sync (race) → vẫn "chờ thanh toán".
     */
    useEffect(() => {
        if (!id || !accessToken) return;
        const paymentParam = paymentReturn;
        let cancelled = false;

        const fetchOrder = async () => {
            setLoading(true);
            try {
                let res;
                let ord;
                if (paymentParam === 'success') {
                    res = await syncPaymentStatus(id);
                    ord = res?.data?.order;
                    /** Backend đã retry; thêm vài lần phía client nếu PayOS chậm cập nhật. */
                    let attempts = 0;
                    while (ord?.paymentStatus === 'pending' && attempts < 4) {
                        await new Promise((r) => setTimeout(r, 900 * (attempts + 1)));
                        if (cancelled) return;
                        res = await syncPaymentStatus(id);
                        ord = res?.data?.order;
                        attempts += 1;
                    }
                    if (cancelled) return;
                    setOrder(ord);
                    if (ord?.paymentStatus === 'paid') {
                        toast.success('Thanh toán thành công! Đơn hàng đã được cập nhật.');
                    } else {
                        toast.info(
                            'Hệ thống chưa ghi nhận thanh toán. Vui lòng tải lại trang sau vài giây hoặc kiểm tra email/SMS từ PayOS.'
                        );
                    }
                    setSearchParams({}, { replace: true });
                } else {
                    res = await getOrderById(id);
                    if (cancelled) return;
                    ord = res?.data?.order;
                    setOrder(ord);
                    if (paymentParam === 'cancelled') {
                        toast.info('Bạn đã hủy thanh toán.');
                        setSearchParams({}, { replace: true });
                    }
                }

                if (ord && shouldLoadPaymentQr(ord)) {
                    if (cancelled) return;
                    await fetchPaymentQrForOrder(ord, () => cancelled);
                } else if (!cancelled) {
                    setVietQRData(null);
                    setPaymentQrError(null);
                }
            } catch (err) {
                if (!cancelled) toast.error(err.response?.data?.message || 'Không tìm thấy đơn hàng');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchOrder();
        return () => {
            cancelled = true;
        };
    }, [id, accessToken, paymentReturn, setSearchParams, fetchPaymentQrForOrder]);

    useEffect(() => {
        if (!accessToken || !order || !canEdit) return;
        getProvinces().then(setProvinces).catch(() => setProvinces([]));
    }, [accessToken, order?._id, canEdit]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const applyAddressFromBook = async (addr) => {
        if (!id) return;
        setActionLoading(true);
        try {
            const res = await updateOrderByCustomer(id, {
                provinceCode: String(addr.provinceCode),
                provinceName: addr.provinceName,
                districtCode: String(addr.districtCode),
                districtName: addr.districtName,
                wardCode: String(addr.wardCode),
                wardName: addr.wardName,
                addressLine: addr.addressLine.trim(),
                shippingPhone: addr.shippingPhone.trim(),
                recipientName: addr.recipientName.trim(),
            });
            setOrder(res?.data?.order || order);
            toast.success('Đã cập nhật địa chỉ giao hàng');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không cập nhật được địa chỉ');
            throw err;
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelOrder = () => {
        setCancelConfirm(true);
    };

    const handleConfirmCancel = async (refundData) => {
        if (!id) return;
        setActionLoading(true);
        try {
            const res = await cancelOrderByCustomer(id, refundData);
            setOrder(res?.data?.order || order);
            toast.success('Đã hủy đơn hàng');
            setCancelConfirm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi hủy đơn hàng');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckBankTransferPaid = async () => {
        if (!id) return;
        setSyncingPayment(true);
        try {
            const res = await syncPaymentStatus(id);
            const ord = res?.data?.order;
            if (ord) setOrder(ord);
            if (ord?.paymentStatus === 'paid') {
                toast.success('Đã ghi nhận thanh toán.');
            } else {
                toast.info(
                    'Chưa thấy thanh toán. Nếu bạn đã chuyển khoản, vui lòng đợi vài phút rồi nhấn lại hoặc kiểm tra đúng nội dung chuyển khoản (mã đơn).'
                );
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Không kiểm tra được trạng thái thanh toán.');
        } finally {
            setSyncingPayment(false);
        }
    };

    const handleBuyAgain = async () => {
        if (!order?.items?.length) return;
        setBuyAgainLoading(true);
        let addedCount = 0;
        try {
            for (const item of order.items) {
                const productId = item.product?._id || item.product;
                const productName = item.product?.name || 'Sản phẩm';
                const qty = item.quantity || 1;
                try {
                    await addToCartServer(productId, qty);
                    addedCount += 1;
                } catch (err) {
                    toast.error(`"${productName}" đã hết hàng`);
                }
            }
            await loadCartFromServer();
            if (addedCount > 0) {
                toast.success(`Đã thêm ${addedCount} sản phẩm vào giỏ hàng`);
                navigate('/cart');
            } else if (order.items.length > 0) {
                toast.error('Tất cả sản phẩm trong đơn đã hết hàng');
            }
        } finally {
            setBuyAgainLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-base-200/40 flex flex-col'>
            <Header
                user={user}
                onLogout={handleLogout}
            />

            <main className='flex-1 container mx-auto px-4 py-8'>
                {loading ? (
                    <PageState variant='loading' title='Đang tải đơn hàng...' />
                ) : !order ? (
                    <PageState
                        variant='empty'
                        icon={PackageX}
                        title='Không tìm thấy đơn hàng'
                        description='Đơn có thể đã bị xóa hoặc liên kết không còn hợp lệ.'
                    >
                        <Link to='/orders'>
                            <Button variant='outline' className='rounded-xl'>
                                Quay lại danh sách đơn
                            </Button>
                        </Link>
                    </PageState>
                ) : (
                    <div className='max-w-2xl mx-auto space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h1 className='text-2xl font-bold text-base-content'>Đơn hàng {order.code}</h1>
                            <Link to='/orders'>
                                <Button variant='outline' size='sm' className='btn-outline btn-sm'>
                                    Danh sách đơn
                                </Button>
                            </Link>
                        </div>

                        <SurfaceCard className='p-6 space-y-4'>
                            <div className='flex flex-wrap gap-3 items-start justify-between'>
                                <div className='flex flex-wrap gap-3'>
                                    <div>
                                        <p className='text-xs text-gray-500 mb-1'>Ngày đặt</p>
                                        <p className='text-gray-800 font-medium'>{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}</p>
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-500 mb-1'>Trạng thái</p>
                                        <OrderStatusBadge status={order.status} />
                                    </div>
                                    <div>
                                        <p className='text-xs text-gray-500 mb-1'>Thanh toán</p>
                                        <PaymentStatusBadge status={order.paymentStatus} />
                                    </div>
                                </div>
                            </div>
                            {order.status === 'cancelled' &&
                                (order.refundBankName || order.refundBankAccount || order.refundAccountHolder) && (
                                    <div className='rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-gray-800'>
                                        <p className='font-semibold text-amber-950 mb-2'>Hoàn tiền</p>
                                        {order.paymentStatus === 'paid' && (
                                            <p className='text-amber-900/90 mb-3 leading-relaxed'>
                                                Đơn đã thanh toán và đã hủy. Cửa hàng sẽ chuyển khoản hoàn tiền theo
                                                thông tin bạn đã gửi. Trạng thái &quot;Đã hoàn tiền&quot; sẽ hiện sau khi
                                                cửa hàng xác nhận.
                                            </p>
                                        )}
                                        {order.paymentStatus === 'refunded' && (
                                            <p className='text-emerald-800 font-medium mb-3'>Đã hoàn tiền.</p>
                                        )}
                                        <ul className='space-y-1 text-gray-700'>
                                            {order.refundBankName ? (
                                                <li>
                                                    <span className='text-gray-500'>Ngân hàng:</span> {order.refundBankName}
                                                </li>
                                            ) : null}
                                            {order.refundBankBin ? (
                                                <li>
                                                    <span className='text-gray-500'>Mã BIN:</span> {order.refundBankBin}
                                                </li>
                                            ) : null}
                                            {order.refundBankAccount ? (
                                                <li>
                                                    <span className='text-gray-500'>Số TK:</span>{' '}
                                                    <span className='font-mono'>{order.refundBankAccount}</span>
                                                </li>
                                            ) : null}
                                            {order.refundAccountHolder ? (
                                                <li>
                                                    <span className='text-gray-500'>Chủ TK:</span> {order.refundAccountHolder}
                                                </li>
                                            ) : null}
                                            <li>
                                                <span className='text-gray-500'>Số tiền:</span>{' '}
                                                <span className='font-semibold'>
                                                    {(order.totalAmount || 0).toLocaleString('vi-VN')}đ
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            <div className='pt-3 border-t border-gray-100 space-y-4'>
                                <div>
                                    <p className='text-xs text-gray-500 mb-2'>Địa chỉ giao hàng</p>
                                    {canEdit ? (
                                        <button
                                            type='button'
                                            onClick={() => setAddressBookOpen(true)}
                                            disabled={actionLoading}
                                            className='w-full text-left rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60'
                                        >
                                            <div className='flex gap-3 items-start'>
                                                <MapPin className='w-5 h-5 shrink-0 text-blue-600 mt-0.5' />
                                                <div className='flex-1 min-w-0 space-y-1'>
                                                    <p className='text-sm font-medium text-gray-900'>
                                                        {order.shippingRecipientName?.trim() || '—'}
                                                    </p>
                                                    <p className='text-sm text-gray-600'>{order.shippingPhone || '—'}</p>
                                                    <p className='text-sm text-gray-600 leading-relaxed'>
                                                        {[
                                                            order.addressLine,
                                                            order.wardName,
                                                            order.districtName,
                                                            order.provinceName,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') || order.shippingAddress || '—'}
                                                    </p>
                                                </div>
                                                <span className='text-xs text-blue-600 font-medium shrink-0 pt-1'>Thay đổi</span>
                                            </div>
                                            <p className='text-xs text-gray-500 mt-3'>
                                                Cùng sổ địa chỉ như khi đặt hàng — chọn địa chỉ đã lưu hoặc thêm mới.
                                            </p>
                                        </button>
                                    ) : (
                                        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
                                            <div className='flex gap-3 items-start'>
                                                <MapPin className='w-5 h-5 shrink-0 text-blue-600 mt-0.5' />
                                                <div className='flex-1 min-w-0 space-y-1'>
                                                    <p className='text-sm font-medium text-gray-900'>
                                                        {order.shippingRecipientName?.trim() || '—'}
                                                    </p>
                                                    <p className='text-sm text-gray-600'>{order.shippingPhone || '—'}</p>
                                                    <p className='text-sm text-gray-600 leading-relaxed'>
                                                        {[
                                                            order.addressLine,
                                                            order.wardName,
                                                            order.districtName,
                                                            order.provinceName,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') || order.shippingAddress || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {order.note?.trim() ? (
                                    <div>
                                        <p className='text-xs text-gray-500 mb-1'>Ghi chú</p>
                                        <p className='text-gray-700'>{order.note}</p>
                                    </div>
                                ) : null}
                            </div>
                        </SurfaceCard>

                        <SurfaceCard className='overflow-hidden p-0'>
                            <div className='px-6 py-4 font-semibold text-base-content bg-base-200/50 border-b border-base-200 flex items-center justify-between gap-3'>
                                <h2>Chi tiết sản phẩm</h2>
                                {canEdit && (
                                    <Link to='/cart'>
                                        <Button variant='outline' size='sm'>Mua thêm</Button>
                                    </Link>
                                )}
                            </div>
                            <div className='divide-y divide-base-200'>
                                {order.items?.map((item, idx) => {
                                    const img = item.product?.images?.[0] || item.product?.image;
                                    return (
                                        <div
                                            key={idx}
                                            className='flex gap-4 items-center px-6 py-4 hover:bg-base-200/40 transition-colors'
                                        >
                                            <div className='w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-base-200/80 border border-base-200/80 flex items-center justify-center'>
                                                {img ? (
                                                    <img
                                                        src={img}
                                                        alt={item.product?.name}
                                                        className='w-full h-full object-contain'
                                                    />
                                                ) : (
                                                    <span className='text-base-content/40 text-xs'>N/A</span>
                                                )}
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <p className='font-medium text-base-content'>{item.product?.name || 'Sản phẩm'}</p>
                                                <p className='text-sm text-base-content/55 mt-0.5'>
                                                    {item.quantity} x {(item.price || 0).toLocaleString()}đ
                                                    {Number(item.vatPercent) > 0 ? (
                                                        <span className='text-base-content/45'> · VAT {item.vatPercent}%</span>
                                                    ) : null}
                                                </p>
                                            </div>
                                            <p className='font-semibold text-base-content shrink-0'>
                                                {(() => {
                                                    const net = (item.quantity || 0) * (item.price || 0);
                                                    const gross =
                                                        item.total != null && item.total !== ''
                                                            ? Number(item.total)
                                                            : net;
                                                    return (Number.isFinite(gross) ? gross : net).toLocaleString();
                                                })()}
                                                đ
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className='px-6 py-4 bg-base-200/45 border-t border-base-200 space-y-2'>
                                {(() => {
                                    const items = order.items || [];
                                    const netSubtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0);
                                    let vatTotal = items.reduce((s, i) => s + (Number(i.vatAmount) || 0), 0);
                                    if (vatTotal <= 0) {
                                        vatTotal = items.reduce((s, i) => {
                                            const net = (i.quantity || 0) * (i.price || 0);
                                            const gross =
                                                i.total != null && i.total !== '' ? Number(i.total) : net;
                                            return s + (Number.isFinite(gross) ? Math.max(0, gross - net) : 0);
                                        }, 0);
                                    }
                                    const grossBeforeDiscount = netSubtotal + vatTotal;
                                    const discount = order.discount ?? 0;
                                    return (
                                        <>
                                            <div className='flex justify-between text-sm text-base-content/70'>
                                                <span>Tiền hàng (chưa thuế)</span>
                                                <span>{netSubtotal.toLocaleString()}đ</span>
                                            </div>
                                            {vatTotal > 0 && (
                                                <div className='flex justify-between text-sm text-base-content/70'>
                                                    <span>Thuế GTGT</span>
                                                    <span>{vatTotal.toLocaleString()}đ</span>
                                                </div>
                                            )}
                                            {vatTotal > 0 && (
                                                <div className='flex justify-between text-xs text-base-content/55 border-b border-base-200/80 pb-2'>
                                                    <span>Tạm tính (gồm thuế)</span>
                                                    <span>{grossBeforeDiscount.toLocaleString()}đ</span>
                                                </div>
                                            )}
                                            {discount > 0 && (
                                                <div className='flex justify-between text-sm text-emerald-600 pt-1'>
                                                    <span>Chiết khấu</span>
                                                    <span>-{discount.toLocaleString()}đ</span>
                                                </div>
                                            )}
                                            <div className='flex justify-between font-bold text-lg pt-2'>
                                                <span className='text-base-content'>Tổng cộng</span>
                                                <span className='text-primary'>{order.totalAmount?.toLocaleString()}đ</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </SurfaceCard>

                        {showPaymentSection && (
                            <SurfaceCard className='p-6 bg-gradient-to-br from-primary/8 via-base-100 to-base-100 border-primary/20 space-y-4'>
                                <div className='flex items-start gap-3'>
                                    <CreditCard className='w-5 h-5 text-primary shrink-0 mt-0.5' />
                                    <div>
                                        <h2 className='font-semibold text-base-content'>Thanh toán đơn hàng</h2>
                                        <p className='text-sm text-base-content/60 mt-1'>
                                            Đơn đang chờ thanh toán. Hoàn tất để cửa hàng xử lý đơn.
                                        </p>
                                    </div>
                                </div>

                                {loadingPaymentQr ? (
                                    <p className='text-sm text-base-content/55'>Đang tải thông tin thanh toán...</p>
                                ) : vietQRData?.checkoutUrl ? (
                                    <>
                                        <p className='text-sm text-base-content/60'>Hoàn tất qua PayOS — đơn sẽ được cập nhật tự động.</p>
                                        <Button asChild size='lg' className='w-full rounded-xl'>
                                            <a href={vietQRData.checkoutUrl} target='_blank' rel='noopener noreferrer'>
                                                Thanh toán qua PayOS
                                            </a>
                                        </Button>
                                    </>
                                ) : vietQRData?.qrDataURL ? (
                                    <>
                                        <p className='text-sm text-base-content/60'>
                                            Quét mã QR hoặc chuyển khoản theo thông tin bên dưới. Nội dung chuyển khoản ghi đúng{' '}
                                            <span className='font-mono font-medium text-base-content'>{order.code}</span>.
                                        </p>
                                        <div className='flex justify-center rounded-xl border border-base-200 bg-base-100 p-4'>
                                            <img src={vietQRData.qrDataURL} alt='Mã QR chuyển khoản' className='max-w-[220px] w-full h-auto' />
                                        </div>
                                        {vietQRData.bankAccount && (
                                            <ul className='text-sm text-base-content/80 space-y-1 rounded-xl border border-base-200 bg-base-100/80 p-4'>
                                                {vietQRData.bankAccount.bankName ? (
                                                    <li>
                                                        <span className='text-base-content/50'>Ngân hàng:</span>{' '}
                                                        {vietQRData.bankAccount.bankName}
                                                    </li>
                                                ) : null}
                                                {vietQRData.bankAccount.bankAccount ? (
                                                    <li>
                                                        <span className='text-base-content/50'>Số TK:</span>{' '}
                                                        <span className='font-mono'>{vietQRData.bankAccount.bankAccount}</span>
                                                    </li>
                                                ) : null}
                                                {vietQRData.bankAccount.userBankName ? (
                                                    <li>
                                                        <span className='text-base-content/50'>Chủ TK:</span> {vietQRData.bankAccount.userBankName}
                                                    </li>
                                                ) : null}
                                                <li>
                                                    <span className='text-base-content/50'>Số tiền:</span>{' '}
                                                    <span className='font-semibold text-base-content'>
                                                        {(order.totalAmount ?? 0).toLocaleString('vi-VN')}đ
                                                    </span>
                                                </li>
                                            </ul>
                                        )}
                                        <div className='flex flex-col sm:flex-row gap-2'>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                className='rounded-xl'
                                                disabled={syncingPayment}
                                                onClick={handleCheckBankTransferPaid}
                                            >
                                                {syncingPayment ? 'Đang kiểm tra...' : 'Đã chuyển khoản — kiểm tra trạng thái'}
                                            </Button>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                className='rounded-xl'
                                                disabled={loadingPaymentQr}
                                                onClick={() => fetchPaymentQrForOrder(order)}
                                            >
                                                <RefreshCw className='w-4 h-4 mr-2' />
                                                Tải lại mã QR
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className='text-sm text-error/90'>{paymentQrError || 'Chưa có thông tin thanh toán.'}</p>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            className='rounded-xl'
                                            disabled={loadingPaymentQr}
                                            onClick={() => fetchPaymentQrForOrder(order)}
                                        >
                                            <RefreshCw className='w-4 h-4 mr-2' />
                                            Thử lại
                                        </Button>
                                    </>
                                )}
                            </SurfaceCard>
                        )}

                        <div className='flex flex-wrap gap-2'>
                            {order.status === 'cancelled' ? (
                                <Button onClick={handleBuyAgain} disabled={buyAgainLoading}>
                                    {buyAgainLoading ? 'Đang thêm...' : 'Mua lại'}
                                </Button>
                            ) : (
                                <Link to='/home'>
                                    <Button>Tiếp tục mua sắm</Button>
                                </Link>
                            )}
                            {canCancel && (
                                <Button
                                    variant='outline'
                                    className='text-error border-error hover:bg-error hover:text-error-content'
                                    onClick={handleCancelOrder}
                                    disabled={actionLoading}
                                >
                                    <XCircle className='w-4 h-4 mr-1.5' />
                                    Hủy đơn hàng
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Footer />

            {canEdit && (
                <ShippingAddressBookDialog
                    open={addressBookOpen}
                    onOpenChange={setAddressBookOpen}
                    provinces={provinces}
                    onAddressesChange={() => {}}
                    pickForOrder
                    onPickAddress={applyAddressFromBook}
                />
            )}

            <CancelOrderModal
                isOpen={cancelConfirm}
                onClose={() => setCancelConfirm(false)}
                onConfirm={handleConfirmCancel}
                order={order}
                isLoading={actionLoading}
            />
        </div>
    );
}
