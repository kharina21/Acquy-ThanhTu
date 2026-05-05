import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { PageState } from '@/components/ui/page-state';
import { SurfaceCard } from '@/components/ui/surface-card';

export default function CartPage() {
    const { user, accessToken, logout } = useAuthStore();
    const {
        items,
        removeItem,
        updateQuantity,
        clearCart,
        loadCartFromServer,
        updateQuantityServer,
        removeItemServer,
        clearCartServer,
        setItemSelected,
        setAllItemsSelected,
        updateItemSelectedServer,
        syncAllItemsSelectedServer,
    } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (accessToken) {
            setLoading(true);
            loadCartFromServer().finally(() => setLoading(false));
        }
    }, [accessToken]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const isLoggedIn = Boolean(accessToken);

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) {
            handleRemoveItem(productId);
            return;
        }
        try {
            setActionLoading(productId);
            if (isLoggedIn) {
                await updateQuantityServer(productId, newQuantity);
            } else {
                updateQuantity(productId, newQuantity);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật số lượng');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveItem = async (productId) => {
        try {
            setActionLoading(productId);
            if (isLoggedIn) {
                await removeItemServer(productId);
            } else {
                removeItem(productId);
            }
            toast.success('Đã xóa khỏi giỏ');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi xóa');
        } finally {
            setActionLoading(null);
        }
    };

    const selectedItems = items.filter((i) => i.selected !== false);
    const allSelected = items.length > 0 && items.every((i) => i.selected !== false);
    const someSelected = items.some((i) => i.selected !== false);

    const handleToggleItemSelected = async (productId, checked) => {
        try {
            setActionLoading(productId);
            if (isLoggedIn) {
                await updateItemSelectedServer(productId, checked === true);
            } else {
                setItemSelected(productId, checked === true);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật lựa chọn');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSelectAll = async (checked) => {
        const on = checked === true;
        try {
            setActionLoading('selectAll');
            if (isLoggedIn) {
                await syncAllItemsSelectedServer(on);
            } else {
                setAllItemsSelected(on);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi chọn tất cả');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearCart = async () => {
        try {
            setActionLoading('clear');
            if (isLoggedIn) {
                await clearCartServer();
            } else {
                clearCart();
            }
            toast.success('Đã xóa giỏ hàng');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi xóa giỏ hàng');
        } finally {
            setActionLoading(null);
        }
    };

    const selectedSubtotal = selectedItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

    return (
        <div className='min-h-screen bg-base-200/40 flex flex-col'>
            <Header
                user={user}
                onLogout={handleLogout}
            />

            <main className='flex-1 container mx-auto px-4 py-8'>
                <div className='max-w-5xl mx-auto'>
                    <h1 className='text-2xl font-bold text-base-content mb-2'>Giỏ hàng</h1>
                    <p className='text-base-content/60 text-sm mb-8'>
                        {items.length} sản phẩm trong giỏ
                        {selectedItems.length > 0 && (
                            <span className='text-base-content/45'> · {selectedItems.length} mục chọn để mua</span>
                        )}
                    </p>

                    {loading ? (
                        <PageState variant='loading' title='Đang tải giỏ hàng...' className='max-w-2xl' />
                    ) : items.length === 0 ? (
                        <PageState
                            variant='empty'
                            icon={ShoppingBag}
                            title='Giỏ hàng trống'
                            description='Thêm sản phẩm để bắt đầu mua sắm.'
                            className='max-w-2xl'
                        >
                            <Link to='/home'>
                                <Button size='lg' className='rounded-xl'>
                                    Tiếp tục mua sắm
                                </Button>
                            </Link>
                        </PageState>
                    ) : (
                        <div className='flex flex-col lg:flex-row gap-8'>
                            {/* Danh sách sản phẩm */}
                            <div className='flex-1 space-y-4'>
                                <div className='flex items-center gap-3 px-1 py-2'>
                                    <Checkbox
                                        id='cart-select-all'
                                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                        onCheckedChange={(v) => handleSelectAll(v === true)}
                                        disabled={!!actionLoading || items.length === 0}
                                    />
                                    <label
                                        htmlFor='cart-select-all'
                                        className='text-sm text-base-content/80 cursor-pointer select-none'
                                    >
                                        Chọn tất cả để thanh toán
                                    </label>
                                </div>
                                {items.map((item) => {
                                    const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                                    const isItemLoading = actionLoading === item.productId;
                                    const isSelected = item.selected !== false;
                                    return (
                                        <div
                                            key={item.productId}
                                            className={`rounded-2xl border p-5 hover:shadow-md transition-all duration-300 bg-base-100 ${
                                                isSelected
                                                    ? 'border-base-200 hover:border-primary/25 shadow-sm'
                                                    : 'border-base-200/70 opacity-90'
                                            }`}
                                        >
                                            <div className='flex items-center gap-3 sm:gap-4'>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(v) => handleToggleItemSelected(item.productId, v)}
                                                    disabled={!!actionLoading}
                                                    aria-label='Chọn để mua'
                                                    className='cursor-pointer checked:bg-primary checked:text-white'
                                                />

                                                <Link
                                                    to={`/product/${item.productId}`}
                                                    className='w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-base-200/70 border border-base-200/80 flex items-center justify-center group'
                                                >
                                                    {item.image ? (
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className='w-full h-full object-contain group-hover:scale-105 transition-transform duration-300'
                                                        />
                                                    ) : (
                                                        <span className='text-base-content/40 text-xs'>N/A</span>
                                                    )}
                                                </Link>
                                                <div className='flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                                                    <div className='min-w-0'>
                                                        <Link to={`/product/${item.productId}`}>
                                                            <h3 className='font-medium text-base-content line-clamp-2 hover:text-primary transition-colors'>{item.name}</h3>
                                                        </Link>
                                                        <p className='text-primary font-semibold mt-1'>{(item.price || 0).toLocaleString()}đ</p>
                                                        {typeof item.stock === 'number' && (
                                                            <p className='text-base-content/55 text-xs mt-0.5'>Tồn kho: {item.stock}</p>
                                                        )}
                                                    </div>
                                                    <div className='flex items-center gap-3'>
                                                        <div className='flex items-center rounded-xl border border-base-300 overflow-hidden bg-base-100'>
                                                            <button
                                                                type='button'
                                                                disabled={isItemLoading || item.quantity <= 1}
                                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                                                className='p-2.5 text-base-content/70 hover:bg-base-200/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                                                            >
                                                                <Minus className='w-4 h-4' />
                                                            </button>
                                                            <span className='px-4 py-2 min-w-10 text-center font-medium text-base-content bg-base-200/50'>
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type='button'
                                                                disabled={isItemLoading || (typeof item.stock === 'number' && item.quantity >= item.stock)}
                                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                                                className='p-2.5 text-base-content/70 hover:bg-base-200/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                                                            >
                                                                <Plus className='w-4 h-4' />
                                                            </button>
                                                        </div>
                                                        <p className='font-semibold text-base-content w-24 text-right shrink-0'>{subtotal.toLocaleString()}đ</p>
                                                        <button
                                                            type='button'
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleRemoveItem(item.productId)}
                                                            className='p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50'
                                                            aria-label='Xóa khỏi giỏ hàng'
                                                            title='Xóa khỏi giỏ hàng'
                                                        >
                                                            <Trash2 className='w-4 h-4' />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tóm tắt đơn hàng - sticky */}
                            <div className='lg:w-[360px] shrink-0'>
                                <SurfaceCard className='p-6 sticky top-4'>
                                    <h2 className='font-semibold text-base-content mb-4'>Tóm tắt đơn hàng</h2>
                                    <div className='space-y-3 mb-6'>
                                        <div className='flex justify-between text-base-content/70'>
                                            <span>Tạm tính ({selectedItems.length} mục đã chọn)</span>
                                            <span>{selectedSubtotal.toLocaleString()}đ</span>
                                        </div>
                                        {selectedItems.length === 0 && items.length > 0 && (
                                            <p className='text-xs text-warning-content bg-warning/10 border border-warning/25 rounded-lg px-3 py-2'>
                                                Chọn ít nhất một sản phẩm để thanh toán. Bỏ chọn để giữ hàng trong giỏ mà không mua lần này.
                                            </p>
                                        )}
                                        <div className='flex justify-between text-lg font-bold text-base-content pt-3 border-t border-base-200'>
                                            <span>Tổng cộng (đã chọn)</span>
                                            <span className='text-primary'>{selectedSubtotal.toLocaleString()}đ</span>
                                        </div>
                                    </div>
                                    <div className='space-y-3'>
                                        <Link
                                            to='/home'
                                            className='block'
                                        >
                                            <Button
                                                variant='outline'
                                                className='w-full rounded-xl'
                                                size='lg'
                                            >
                                                Tiếp tục mua sắm
                                            </Button>
                                        </Link>
                                        {isLoggedIn ? (
                                            selectedItems.length > 0 ? (
                                                <Link
                                                    to='/checkout'
                                                    className='block'
                                                >
                                                    <Button
                                                        className='w-full rounded-xl'
                                                        size='lg'
                                                    >
                                                        Đặt hàng ({selectedItems.length} mục)
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button
                                                    className='w-full rounded-xl'
                                                    size='lg'
                                                    disabled
                                                    variant='secondary'
                                                >
                                                    Chọn sản phẩm để đặt hàng
                                                </Button>
                                            )
                                        ) : (
                                            <Link
                                                to='/login?redirect=/checkout'
                                                className='block'
                                            >
                                                <Button
                                                    className='w-full rounded-xl'
                                                    size='lg'
                                                >
                                                    Đặt hàng (cần đăng nhập)
                                                </Button>
                                            </Link>
                                        )}
                                        <Button
                                            variant='ghost'
                                            className='w-full text-base-content/55 hover:text-error hover:bg-error/5 rounded-xl'
                                            size='sm'
                                            disabled={!!actionLoading}
                                            onClick={handleClearCart}
                                        >
                                            Xóa giỏ hàng
                                        </Button>
                                    </div>
                                </SurfaceCard>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
