import { Search, User, LogOut, ShoppingCart, Package } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCartStore } from '@/stores/useCartStore';

export function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/logohomepage.png"
              alt="Acquy Hanoi"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            {/* Thanh tìm kiếm */}
            <div className="relative hidden lg:block flex-1 max-w-xl mx-10">
              <input
                type="text"
                placeholder="Bạn cần tìm loại ắc quy nào? (VD: GS, Pinaco, Atlas...)"
                className="w-full px-5 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-full text-sm 
               focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 
               transition-all outline-none pr-12"
              />
              <div className="absolute right-1 top-1 bottom-1 flex items-center">
                <Button size="icon" variant="ghost" className="rounded-full hover:bg-blue-50 text-blue-600">
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Nút giỏ hàng */}
            <Link to="/cart" className="relative">
              <Button variant="outline" size="icon" className="rounded-full">
                <ShoppingCart className="w-5 h-5" />
                {totalQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                    {totalQuantity > 99 ? '99+' : totalQuantity}
                  </span>
                )}
              </Button>
            </Link>

            {/* Xử lý nút Đăng nhập / User */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="w-4 h-4" /> {user.name}
                  </Button>

                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" /> Hồ sơ cá nhân
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/orders')}
                    className="cursor-pointer"
                  >
                    <Package className="w-4 h-4 mr-2" /> Đơn hàng
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-red-600 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Đăng nhập</Button>
                <Button size="sm" className="bg-blue-600" onClick={() => navigate('/register')}>Đăng ký</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="bg-blue-900 text-white text-xs font-bold uppercase">
        <div className="container mx-auto px-4 flex gap-6 py-3">
          <span onClick={() => navigate('/')} className="cursor-pointer hover:text-orange-400">Trang chủ</span>
          <span onClick={() => navigate('/listproduct')} className="cursor-pointer hover:text-orange-400">Sản phẩm</span>
          <span className="cursor-pointer hover:text-orange-400">Thu mua ắc quy</span>
          <span className="cursor-pointer hover:text-orange-400">Liên hệ</span>
        </div>
      </nav>
    </>
  );
}