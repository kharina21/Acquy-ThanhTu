import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge, PaymentStatusBadge, STATUS_CONFIG } from '@/components/order/StatusBadge';
import { getMyOrders, cancelOrderByCustomer } from '@/services/orderService';
import { toast } from 'sonner';
import { Package, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import CancelOrderModal from '@/components/common/CancelOrderModal';
import { PageState } from '@/components/ui/page-state';
import { SurfaceCard } from '@/components/ui/surface-card';

const TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'refunded', label: 'Đã hoàn tiền' },
];

const LIMIT = 8;

export default function OrderHistoryPage() {
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [activeTab, setActiveTab] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [cancellingId, setCancellingId] = useState(null);
    const [cancelConfirm, setCancelConfirm] = useState({ show: false, orderId: null, order: null });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: LIMIT };
            if (activeTab === 'refunded') {
                params.paymentStatus = 'refunded';
            } else if (activeTab) {
                params.status = activeTab;
            }
            const res = await getMyOrders(params);
            const data = res?.data;
            setOrders(data?.orders || []);
            setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tải đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage]);

    useEffect(() => {
        if (!accessToken) return;
        fetchOrders();
    }, [accessToken, fetchOrders]);

    const handleTabChange = (key) => {
        setActiveTab(key);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleCancelOrder = (e, order) => {
        e.preventDefault();
        e.stopPropagation();
        setCancelConfirm({ show: true, orderId: order._id, order });
    };

    const handleConfirmCancel = async (refundData) => {
        const orderId = cancelConfirm.orderId;
        if (!orderId) return;
        setCancellingId(orderId);
        try {
            await cancelOrderByCustomer(orderId, refundData);
            toast.success('Đã hủy đơn hàng');
            fetchOrders();
            setCancelConfirm({ show: false, orderId: null, order: null });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi hủy đơn hàng');
        } finally {
            setCancellingId(null);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const { page, totalPages, total } = pagination;
    const hasOrders = orders.length > 0;

    return (
        <div className='min-h-screen bg-base-200/40 flex flex-col'>
            <Header
                user={user}
                onLogout={handleLogout}
            />

            <main className='flex-1 container mx-auto px-4 py-8'>
                <h1 className='text-2xl font-bold text-base-content mb-2'>Đơn hàng của tôi</h1>
                <p className='text-base-content/60 text-sm mb-6'>{total > 0 ? `${total} đơn hàng` : 'Chưa có đơn hàng'}</p>

                {/* Tabs */}
                <div className='flex flex-wrap gap-2 mb-6'>
                    {TABS.map((tab) => (
                        <button
                            key={tab.key || 'all'}
                            type='button'
                            onClick={() => handleTabChange(tab.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                activeTab === tab.key
                                    ? 'bg-primary text-primary-content border-primary shadow-sm'
                                    : 'bg-base-100 text-base-content/70 border-base-200 hover:bg-base-200/60 hover:border-base-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <PageState variant='loading' title='Đang tải danh sách đơn...' className='max-w-2xl' />
                ) : !hasOrders ? (
                    <PageState
                        variant='empty'
                        icon={Package}
                        title={
                            activeTab
                                ? activeTab === 'refunded'
                                    ? 'Không có đơn đã hoàn tiền'
                                    : `Không có đơn ${STATUS_CONFIG[activeTab]?.label?.toLowerCase() || activeTab}`
                                : 'Chưa có đơn hàng nào'
                        }
                        description='Khám phá sản phẩm và đặt mua khi bạn sẵn sàng.'
                        className='max-w-2xl'
                    >
                        <Link to='/home'>
                            <Button className='rounded-xl'>Mua sắm ngay</Button>
                        </Link>
                    </PageState>
                ) : (
                    <>
                        <div className='space-y-4'>
                            {orders.map((order) => {
                                const firstImg = order.items?.[0]?.product?.images?.[0] || order.items?.[0]?.product?.image;
                                const canCancel = order.status !== 'cancelled' && order.status === 'pending';
                                return (
                                    <SurfaceCard
                                        key={order._id}
                                        className='p-5 hover:shadow-md hover:border-primary/25 transition-all duration-200'
                                    >
                                        <Link
                                            to={`/orders/${order._id}`}
                                            className='block'
                                        >
                                            <div className='flex gap-4 sm:items-center'>
                                                {firstImg && (
                                                    <div className='w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-base-200/80 border border-base-200/80 flex items-center justify-center'>
                                                        <img
                                                            src={firstImg}
                                                            alt=''
                                                            className='w-full h-full object-contain'
                                                        />
                                                    </div>
                                                )}
                                                <div className='flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                                                    <div>
                                                        <p className='font-semibold text-base-content'>{order.code}</p>
                                                        <p className='text-sm text-base-content/55 mt-0.5'>
                                                            Ngày đặt: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                                                        </p>
                                                    </div>
                                                    <div className='flex items-center gap-3 flex-wrap'>
                                                        <OrderStatusBadge status={order.status} />
                                                        <PaymentStatusBadge status={order.paymentStatus} />
                                                        <span className='font-bold text-primary'>{order.totalAmount?.toLocaleString()}đ</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                        {canCancel && (
                                            <div className='mt-3 pt-3 border-t border-base-200'>
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    className='text-error border-error hover:bg-error hover:text-error-content'
                                                    onClick={(e) => handleCancelOrder(e, order)}
                                                    disabled={cancellingId === order._id}
                                                >
                                                    <XCircle className='w-4 h-4 mr-1' />
                                                    {cancellingId === order._id ? 'Đang hủy...' : 'Hủy đơn'}
                                                </Button>
                                            </div>
                                        )}
                                    </SurfaceCard>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className='flex items-center justify-center gap-2 mt-8'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={page <= 1}
                                    onClick={() => handlePageChange(page - 1)}
                                    className='rounded-lg'
                                >
                                    <ChevronLeft className='w-4 h-4' />
                                </Button>
                                <div className='flex items-center gap-1'>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                        .map((p, idx, arr) => (
                                            <span key={p}>
                                                {idx > 0 && arr[idx - 1] !== p - 1 && <span className='px-2 text-base-content/40'>…</span>}
                                                <button
                                                    type='button'
                                                    onClick={() => handlePageChange(p)}
                                                    className={`min-w-9 h-9 rounded-lg text-sm font-medium transition-colors border ${
                                                        p === page
                                                            ? 'bg-primary text-primary-content border-primary'
                                                            : 'bg-base-100 border-base-200 text-base-content/70 hover:bg-base-200/50'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        ))}
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={page >= totalPages}
                                    onClick={() => handlePageChange(page + 1)}
                                    className='rounded-lg'
                                >
                                    <ChevronRight className='w-4 h-4' />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />

            <CancelOrderModal
                isOpen={cancelConfirm.show}
                onClose={() => setCancelConfirm({ show: false, orderId: null, order: null })}
                onConfirm={handleConfirmCancel}
                order={cancelConfirm.order}
                isLoading={cancellingId === cancelConfirm.orderId}
            />
        </div>
    );
}
