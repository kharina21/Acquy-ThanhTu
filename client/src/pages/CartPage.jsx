import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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
  const [actionLoading, setActionLoading] = useState(false);

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
      setActionLoading(true);
      if (isLoggedIn) {
        await updateQuantityServer(productId, newQuantity);
      } else {
        updateQuantity(productId, newQuantity);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật số lượng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      setActionLoading(true);
      if (isLoggedIn) {
        await removeItemServer(productId);
      } else {
        removeItem(productId);
      }
      toast.success('Đã xóa khỏi giỏ');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearCart = async () => {
    try {
      setActionLoading(true);
      if (isLoggedIn) {
        await clearCartServer();
      } else {
        clearCart();
      }
      toast.success('Đã xóa giỏ hàng');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa giỏ hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const total = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Giỏ hàng</h1>

        {loading ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600">Đang tải giỏ hàng...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">Giỏ hàng trống</p>
            <Link to="/home">
              <Button>Tiếp tục mua sắm</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{item.name}</h3>
                    <p className="text-red-600 font-bold mt-1">
                      {item.price?.toLocaleString()}đ
                    </p>
                    {typeof item.stock === 'number' && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        Tồn kho: {item.stock}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="join">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="join-item btn-sm"
                        disabled={actionLoading}
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                      >
                        −
                      </Button>
                      <span className="join-item px-4 bg-base-200 flex items-center min-w-10 justify-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="join-item btn-sm"
                        disabled={actionLoading || (typeof item.stock === 'number' && item.quantity >= item.stock)}
                        onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="btn-ghost btn-sm btn-square text-error"
                      disabled={actionLoading}
                      onClick={() => handleRemoveItem(item.productId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-6">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={actionLoading} onClick={handleClearCart}>
                  Xóa giỏ hàng
                </Button>
                <Link to="/home">
                  <Button variant="outline" size="sm">Tiếp tục mua sắm</Button>
                </Link>
                {isLoggedIn ? (
                  <Link to="/checkout">
                    <Button size="sm">Đặt hàng</Button>
                  </Link>
                ) : (
                  <Link to="/login?redirect=/checkout">
                    <Button size="sm">Đặt hàng (cần đăng nhập)</Button>
                  </Link>
                )}
              </div>
              <div className="text-lg font-bold text-gray-800">
                Tổng tiền: <span className="text-red-600">{total.toLocaleString()}đ</span>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
