import { Search, User, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export function Header({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <>
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">P</div>
            <div>
              <h1 className="text-blue-700 font-bold text-lg leading-none uppercase">Acquyhanoi.vn</h1>
              <p className="text-[10px] text-gray-500 uppercase">Đại lý ắc quy Thanh Tú</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {/* Thanh tìm kiếm */}
            <div className="relative hidden md:block">
              <input type="text" placeholder="Tìm kiếm..." className="px-3 py-1.5 border rounded-md text-sm w-48" />
              <Search className="absolute right-2 top-2 w-4 h-4 text-gray-400" />
            </div>

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
          <span className="cursor-pointer hover:text-orange-400">Sản phẩm</span>
          <span className="cursor-pointer hover:text-orange-400">Thu mua ắc quy</span>
          <span className="cursor-pointer hover:text-orange-400">Liên hệ</span>
        </div>
      </nav>
    </>
  );
}