import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

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
  } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      loadCartFromServer()
        .finally(() => setLoading(false));
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

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng</h1>
          <p className="text-gray-500 text-sm mb-8">{items.length} sản phẩm trong giỏ</p>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="text-gray-500 mt-4">Đang tải giỏ hàng...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">Giỏ hàng trống</p>
              <p className="text-gray-500 text-sm mb-6">Thêm sản phẩm để bắt đầu mua sắm</p>
              <Link to="/home">
                <Button size="lg" className="rounded-xl">Tiếp tục mua sắm</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Danh sách sản phẩm */}
              <div className="flex-1 space-y-4">
                {items.map((item) => {
                  const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                  const isItemLoading = actionLoading === item.productId;
                  return (
                    <div
                      key={item.productId}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200/80 transition-all duration-300"
                    >
                      <div className="flex gap-4 sm:gap-5">
                        <Link
                          to={`/product/${item.productId}`}
                          className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center group"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0">
                            <Link to={`/product/${item.productId}`}>
                              <h3 className="font-medium text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors">
                                {item.name}
                              </h3>
                            </Link>
                            <p className="text-blue-600 font-semibold mt-1">
                              {(item.price || 0).toLocaleString()}đ
                            </p>
                            {typeof item.stock === 'number' && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                Tồn kho: {item.stock}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
                              <button
                                type="button"
                                disabled={isItemLoading || item.quantity <= 1}
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                className="p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 min-w-10 text-center font-medium text-gray-800 bg-gray-50/50">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={isItemLoading || (typeof item.stock === 'number' && item.quantity >= item.stock)}
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                className="p-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="font-semibold text-gray-800 w-24 text-right shrink-0">
                              {subtotal.toLocaleString()}đ
                            </p>
                            <button
                              type="button"
                              disabled={!!actionLoading}
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                              aria-label="Xóa khỏi giỏ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tóm tắt đơn hàng - sticky */}
              <div className="lg:w-[360px] shrink-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
                  <h2 className="font-semibold text-gray-800 mb-4">Tóm tắt đơn hàng</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Tạm tính ({items.length} sản phẩm)</span>
                      <span>{total.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t border-gray-100">
                      <span>Tổng cộng</span>
                      <span className="text-blue-600">{total.toLocaleString()}đ</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link to="/home" className="block">
                      <Button variant="outline" className="w-full rounded-xl" size="lg">
                        Tiếp tục mua sắm
                      </Button>
                    </Link>
                    {isLoggedIn ? (
                      <Link to="/checkout" className="block">
                        <Button className="w-full rounded-xl" size="lg">
                          Đặt hàng
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/login?redirect=/checkout" className="block">
                        <Button className="w-full rounded-xl" size="lg">
                          Đặt hàng (cần đăng nhập)
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full text-gray-500 hover:text-error hover:bg-error/5 rounded-xl"
                      size="sm"
                      disabled={!!actionLoading}
                      onClick={handleClearCart}
                    >
                      Xóa giỏ hàng
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
