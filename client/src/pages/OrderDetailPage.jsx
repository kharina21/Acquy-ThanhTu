import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadge';
import { getOrderById, generateVietQR } from '@/services/orderService';
import { toast } from 'sonner';

export default function OrderDetailPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [vietQRData, setVietQRData] = useState(null); // { qrDataURL, bankAccount, checkoutUrl }

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
        const fetchOrder = async () => {
            setLoading(true);
            try {
                const res = await getOrderById(id);
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
    }, [id, accessToken]);
    // Refetch khi quay về từ PayOS (returnUrl) để cập nhật paymentStatus sau khi webhook xử lý
    useEffect(() => {
        if (searchParams.get('payment') !== 'success' || !id) return;
        const t = setTimeout(() => {
            getOrderById(id)
                .then((res) => {
                    const ord = res?.data?.order;
                    if (ord) setOrder(ord);
                })
                .catch(() => {});
        }, 2500);
        return () => clearTimeout(t);
    }, [id, searchParams.get('payment')]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
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
                            <div className='pt-3 border-t border-gray-100'>
                                <p className='text-xs text-gray-500 mb-1'>Địa chỉ giao hàng</p>
                                <p className='text-gray-800'>{order.shippingAddress || '—'}</p>
                            </div>
                            {order.note && (
                                <div>
                                    <p className='text-xs text-gray-500 mb-1'>Ghi chú</p>
                                    <p className='text-gray-700'>{order.note}</p>
                                </div>
                            )}
                        </div>

                        {vietQRData && vietQRData.checkoutUrl && order.paymentStatus === 'pending' && (
                            <div className='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6'>
                                <h2 className='font-semibold text-gray-800 mb-4'>Thanh toán chuyển khoản</h2>
                                <Button asChild size='lg' className='w-full'>
                                    <a
                                        href={vietQRData.checkoutUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        Thanh toán qua PayOS
                                    </a>
                                </Button>
                            </div>
                        )}

                        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
                            <h2 className='px-6 py-4 font-semibold text-gray-800 bg-gray-50/80'>Chi tiết sản phẩm</h2>
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

                        <div className='flex gap-2'>
                            <Link to='/home'>
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
