import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadge';
import { getOrderById, generateVietQR, updateOrderByCustomer, cancelOrderByCustomer, syncPaymentStatus } from '@/services/orderService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { toast } from 'sonner';
import { Pencil, XCircle } from 'lucide-react';
import CancelOrderModal from '@/components/common/CancelOrderModal';

export default function OrderDetailPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [vietQRData, setVietQRData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        provinceCode: '', provinceName: '', districtCode: '', districtName: '', wardCode: '', wardName: '',
        addressLine: '', shippingPhone: '', note: '',
    });
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [cancelConfirm, setCancelConfirm] = useState(false);
    const [buyAgainLoading, setBuyAgainLoading] = useState(false);
    const navigate = useNavigate();
    const addToCartServer = useCartStore((s) => s.addToCartServer);
    const loadCartFromServer = useCartStore((s) => s.loadCartFromServer);

    const canEdit = order && order.status !== 'cancelled' && order.paymentStatus === 'pending';
    const canCancel = order && order.status !== 'cancelled' && order.status === 'pending';

    useEffect(() => {
        const payment = searchParams.get('payment');
        if (payment === 'success') {
            toast.success('Thanh toán thành công! Đơn hàng đã được cập nhật.');
            setSearchParams({}, { replace: true });
        } else if (payment === 'cancelled') {
            toast.info('Bạn đã hủy thanh toán.');
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!id || !accessToken) return;
        const isReturnFromPayOS = searchParams.get('payment') === 'success';
        const fetchOrder = async () => {
            setLoading(true);
            try {
                // Khi quay về từ PayOS: gọi sync để lấy trạng thái mới nhất từ PayOS API ngay lập tức
                const res = isReturnFromPayOS
                    ? await syncPaymentStatus(id)
                    : await getOrderById(id);
                const ord = res?.data?.order;
                setOrder(ord);
                if (ord && ord.paymentStatus === 'pending' && (ord.paymentMethod === 'transfer' || ord.paymentMethod === 'vietqr')) {
                    try {
                        const qrRes = await generateVietQR(id);
                        const qrData = qrRes?.data;
                        setVietQRData({ qrDataURL: qrData?.qrDataURL, bankAccount: qrData?.bankAccount, checkoutUrl: qrData?.checkoutUrl });
                    } catch {
                        setVietQRData(null);
                    }
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'Không tìm thấy đơn hàng');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id, accessToken, searchParams.get('payment')]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const handleStartEdit = () => {
        const addrLine = order?.addressLine || order?.shippingAddress || '';
        setEditForm({
            provinceCode: order?.provinceCode || '', provinceName: order?.provinceName || '',
            districtCode: order?.districtCode || '', districtName: order?.districtName || '',
            wardCode: order?.wardCode || '', wardName: order?.wardName || '',
            addressLine: addrLine, shippingPhone: order?.shippingPhone || '', note: order?.note || '',
        });
        setIsEditing(true);
        getProvinces().then(setProvinces).catch(() => setProvinces([]));
        if (order?.provinceCode) {
            getDistricts(order.provinceCode).then(setDistricts).catch(() => setDistricts([]));
            if (order?.districtCode) {
                getWards(order.districtCode).then(setWards).catch(() => setWards([]));
            } else setWards([]);
        } else {
            setDistricts([]);
            setWards([]);
        }
    };

    const handleSaveEdit = async () => {
        if (!id) return;
        const addressLine = editForm.addressLine?.trim();
        if (!addressLine) {
            toast.error('Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)');
            return;
        }
        const hasStructured = editForm.provinceCode && editForm.districtCode && editForm.wardCode;
        if (!hasStructured) {
            toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã');
            return;
        }
        if (!editForm.shippingPhone?.trim()) {
            toast.error('Vui lòng nhập số điện thoại nhận hàng');
            return;
        }
        setActionLoading(true);
        try {
            const res = await updateOrderByCustomer(id, {
                provinceCode: editForm.provinceCode, provinceName: editForm.provinceName,
                districtCode: editForm.districtCode, districtName: editForm.districtName,
                wardCode: editForm.wardCode, wardName: editForm.wardName,
                addressLine, shippingPhone: editForm.shippingPhone.trim(), note: editForm.note,
            });
            setOrder(res?.data?.order || order);
            setIsEditing(false);
            toast.success('Cập nhật đơn hàng thành công');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật đơn hàng');
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
        <div className='min-h-screen bg-white flex flex-col'>
            <Header
                user={user}
                onLogout={handleLogout}
            />

            <main className='flex-1 container mx-auto px-4 py-8'>
                {loading ? (
                    <div className='flex justify-center py-12'>
                        <span className='loading loading-spinner loading-lg text-primary' />
                    </div>
                ) : !order ? (
                    <div className='text-center py-12'>
                        <p className='text-gray-600 mb-4'>Không tìm thấy đơn hàng</p>
                        <Link to='/orders'>
                            <Button variant='outline'>Quay lại danh sách đơn</Button>
                        </Link>
                    </div>
                ) : (
                    <div className='max-w-2xl mx-auto space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h1 className='text-2xl font-bold text-gray-800'>Đơn hàng {order.code}</h1>
                            <Link to='/orders'>
                                <Button variant='outline' size='sm' className='btn-outline btn-sm'>
                                    Danh sách đơn
                                </Button>
                            </Link>
                        </div>

                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4'>
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
                                {canEdit && !isEditing && (
                                    <Button variant='outline' size='sm' onClick={handleStartEdit} className='gap-1.5'>
                                        <Pencil className='w-4 h-4' /> Chỉnh sửa
                                    </Button>
                                )}
                            </div>
                            {isEditing ? (
                                <div className='pt-3 border-t border-gray-100 space-y-4'>
                                    <div>
                                        <label className='label py-0 text-xs'>Tỉnh / Thành phố</label>
                                        <select
                                            className='select select-bordered select-sm w-full'
                                            value={editForm.provinceCode}
                                            onChange={(e) => {
                                                const code = e.target.value;
                                                const p = provinces.find((x) => String(x.code) === code);
                                                setEditForm((f) => ({ ...f, provinceCode: code, provinceName: p?.name || '', districtCode: '', districtName: '', wardCode: '', wardName: '' }));
                                                if (code) getDistricts(code).then(setDistricts).catch(() => setDistricts([]));
                                                else setDistricts([]);
                                                setWards([]);
                                            }}
                                        >
                                            <option value=''>— Chọn Tỉnh/Thành phố —</option>
                                            {provinces.map((p) => (
                                                <option key={p.code} value={p.code}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className='label py-0 text-xs'>Quận / Huyện</label>
                                        <select
                                            className='select select-bordered select-sm w-full'
                                            value={editForm.districtCode}
                                            onChange={(e) => {
                                                const code = e.target.value;
                                                const d = districts.find((x) => String(x.code) === code);
                                                setEditForm((f) => ({ ...f, districtCode: code, districtName: d?.name || '', wardCode: '', wardName: '' }));
                                                if (code) getWards(code).then(setWards).catch(() => setWards([]));
                                                else setWards([]);
                                            }}
                                            disabled={!editForm.provinceCode}
                                        >
                                            <option value=''>— Chọn Quận/Huyện —</option>
                                            {districts.map((d) => (
                                                <option key={d.code} value={d.code}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className='label py-0 text-xs'>Phường / Xã / Thị trấn</label>
                                        <select
                                            className='select select-bordered select-sm w-full'
                                            value={editForm.wardCode}
                                            onChange={(e) => {
                                                const code = e.target.value;
                                                const w = wards.find((x) => String(x.code) === code);
                                                setEditForm((f) => ({ ...f, wardCode: code, wardName: w?.name || '' }));
                                            }}
                                            disabled={!editForm.districtCode}
                                        >
                                            <option value=''>— Chọn Phường/Xã/Thị trấn —</option>
                                            {wards.map((w) => (
                                                <option key={w.code} value={w.code}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className='label py-0 text-xs'>Địa chỉ cụ thể (số nhà, tên đường...)</label>
                                        <input
                                            type='text'
                                            value={editForm.addressLine}
                                            onChange={(e) => setEditForm((f) => ({ ...f, addressLine: e.target.value }))}
                                            className='input input-bordered input-sm w-full'
                                            placeholder='Ví dụ: Số 123, đường ABC'
                                        />
                                    </div>
                                    <div>
                                        <label className='label py-0 text-xs'>Số điện thoại nhận hàng</label>
                                        <input
                                            type='tel'
                                            value={editForm.shippingPhone}
                                            onChange={(e) => setEditForm((f) => ({ ...f, shippingPhone: e.target.value }))}
                                            className='input input-bordered input-sm w-full'
                                            placeholder='Số điện thoại nhận hàng'
                                        />
                                    </div>
                                    <div>
                                        <label className='label py-0 text-xs'>Ghi chú</label>
                                        <textarea
                                            value={editForm.note}
                                            onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                                            className='textarea textarea-bordered textarea-sm w-full min-h-[80px]'
                                            placeholder='Ghi chú cho đơn hàng'
                                        />
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button size='sm' onClick={handleSaveEdit} disabled={actionLoading}>
                                            {actionLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                        </Button>
                                        <Button variant='outline' size='sm' onClick={() => setIsEditing(false)} disabled={actionLoading}>
                                            Hủy
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className='pt-3 border-t border-gray-100'>
                                        <p className='text-xs text-gray-500 mb-1'>Địa chỉ giao hàng</p>
                                        <p className='text-gray-800'>{order.shippingAddress || '—'}</p>
                                    </div>
                                    {order.shippingPhone && (
                                        <div>
                                            <p className='text-xs text-gray-500 mb-1'>Số điện thoại nhận hàng</p>
                                            <p className='text-gray-800'>{order.shippingPhone}</p>
                                        </div>
                                    )}
                                    {order.note && (
                                        <div>
                                            <p className='text-xs text-gray-500 mb-1'>Ghi chú</p>
                                            <p className='text-gray-700'>{order.note}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                            <div className='px-6 py-4 font-semibold text-gray-800 bg-gray-50/80 flex items-center justify-between gap-3'>
                                <h2>Chi tiết sản phẩm</h2>
                                {canEdit && (
                                    <Link to='/cart'>
                                        <Button variant='outline' size='sm'>Mua thêm</Button>
                                    </Link>
                                )}
                            </div>
                            <div className='divide-y divide-gray-100'>
                                {order.items?.map((item, idx) => {
                                    const img = item.product?.images?.[0] || item.product?.image;
                                    return (
                                        <div
                                            key={idx}
                                            className='flex gap-4 items-center px-6 py-4 hover:bg-gray-50/50 transition-colors'
                                        >
                                            <div className='w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center'>
                                                {img ? (
                                                    <img
                                                        src={img}
                                                        alt={item.product?.name}
                                                        className='w-full h-full object-contain'
                                                    />
                                                ) : (
                                                    <span className='text-gray-400 text-xs'>N/A</span>
                                                )}
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <p className='font-medium text-gray-800'>{item.product?.name || 'Sản phẩm'}</p>
                                                <p className='text-sm text-gray-500 mt-0.5'>
                                                    {item.quantity} x {(item.price || 0).toLocaleString()}đ
                                                </p>
                                            </div>
                                            <p className='font-semibold text-gray-800 shrink-0'>{(item.quantity * (item.price || 0))?.toLocaleString()}đ</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className='px-6 py-4 bg-gray-50/80 space-y-2'>
                                {(() => {
                                    const subtotal = order.items?.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0) ?? 0;
                                    const discount = order.discount ?? 0;
                                    return (
                                        <>
                                            <div className='flex justify-between text-sm text-gray-600'>
                                                <span>Tạm tính</span>
                                                <span>{subtotal.toLocaleString()}đ</span>
                                            </div>
                                            {discount > 0 && (
                                                <div className='flex justify-between text-sm text-emerald-600'>
                                                    <span>Chiết khấu</span>
                                                    <span>-{discount.toLocaleString()}đ</span>
                                                </div>
                                            )}
                                            <div className='flex justify-between font-bold text-lg pt-2'>
                                                <span className='text-gray-700'>Tổng cộng</span>
                                                <span className='text-blue-600'>{order.totalAmount?.toLocaleString()}đ</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {vietQRData?.checkoutUrl && order.paymentStatus === 'pending' && order.status !== 'cancelled' && (
                            <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6'>
                                <h2 className='font-semibold text-gray-800 mb-4'>Thanh toán chuyển khoản</h2>
                                <Button asChild size='lg' className='w-full'>
                                    <a href={vietQRData.checkoutUrl} target='_blank' rel='noopener noreferrer'>
                                        Thanh toán qua PayOS
                                    </a>
                                </Button>
                            </div>
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
