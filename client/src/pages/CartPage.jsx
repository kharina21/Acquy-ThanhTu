import { Link } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CartPage() {
  const { user, logout } = useAuthStore();
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đã đăng xuất thành công !');
    } catch (error) {
      toast.error('Lỗi khi đăng xuất !');
    }
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Giỏ hàng</h1>

        {items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-4">Giỏ hàng trống</p>
            <Link to="/home">
              <Button className="bg-blue-600 hover:bg-blue-700">Tiếp tục mua sắm</Button>
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
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="px-3 py-1 min-w-[2rem] text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        removeItem(item.productId);
                        toast.success('Đã xóa khỏi giỏ');
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-6">
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCart}>
                  Xóa giỏ hàng
                </Button>
                <Link to="/home">
                  <Button variant="outline">Tiếp tục mua sắm</Button>
                </Link>
              </div>
              <div className="text-lg font-bold text-gray-800">
                Tổng tiền: <span className="text-red-600">{total.toLocaleString()}đ</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500 italic">
              (Giao diện giỏ hàng – chưa kết nối thanh toán)
            </p>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
