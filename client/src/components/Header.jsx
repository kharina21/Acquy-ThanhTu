import { Search, User, LogOut, ShoppingCart, Package, Menu, ChevronDown, Send, FileSearch, ClipboardList, ShieldCheck } from 'lucide-react';
import { getDisplayName } from '@/lib/utils';
import { useNavigate, Link } from 'react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCartStore } from '@/stores/useCartStore';
import { getProducts } from '@/services/productService';

const navLinks = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Sản phẩm', to: '/listproduct' },
    { label: 'Liên hệ', to: '/contact' },
];

export function Header({ user, onLogout }) {
    const navigate = useNavigate();
    const items = useCartStore((s) => s.items);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const handleSearch = async (value) => {
        setSearch(value);
        if (!value?.trim()) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await getProducts({ search: value.trim(), limit: 5, page: 1 });
            const list = res?.data?.products ?? [];
            setSuggestions(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error);
            setSuggestions([]);
        }
    };

    const handleSubmitSearch = () => {
        const keyword = search.trim();
        if (!keyword) {
            navigate('/listproduct');
        } else {
            navigate(`/listproduct?search=${keyword}`);
        }
        setSuggestions([]);
    };

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
            {/* Top bar */}
            <div className="container mx-auto px-4 lg:px-6">
                <div className="flex items-center justify-between h-16 gap-4 min-w-0">
                    {/* Logo */}
                    <Link to="/" className="flex items-center shrink-0">
                        <img
                            src="/logohomepage.png"
                            alt="Ắc Quy Thanh Tú"
                            className="h-10 lg:h-11 w-auto object-contain transition-opacity hover:opacity-90"
                        />
                    </Link>

                    {/* Search - Desktop */}
                    <div className="relative hidden lg:block flex-1 min-w-0 max-w-md xl:max-w-lg mx-4 xl:mx-6">
                        <div className="relative group">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSubmitSearch())}
                                placeholder="Tìm ắc quy (GS, Pinaco, Atlas...)"
                                className="w-full pl-4 pr-12 py-2.5 bg-gray-50/80 border border-gray-200/80 rounded-xl text-sm
                                    placeholder:text-gray-400
                                    focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10
                                    transition-all duration-200 outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleSubmitSearch}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                {suggestions.map((product) => (
                                    <Link
                                        key={product._id}
                                        to={`/product/${product._id}`}
                                        className="block px-4 py-3 hover:bg-gray-50/80 text-gray-700 text-sm transition-colors border-b border-gray-50 last:border-0"
                                    >
                                        {product.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                        <Link to="/cart" className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-gray-600 hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {totalQuantity > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-primary-content text-[10px] font-semibold rounded-full">
                                        {totalQuantity > 99 ? '99+' : totalQuantity}
                                    </span>
                                )}
                            </Button>
                        </Link>

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-gray-200 hover:border-primary/30 hover:bg-primary/5 gap-2"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="hidden sm:inline max-w-[180px] truncate">{getDisplayName(user)}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100 p-1">
                                    <DropdownMenuItem
                                        onClick={() => navigate('/profile')}
                                        className="rounded-lg cursor-pointer gap-2 py-2.5"
                                    >
                                        <User className="w-4 h-4" /> Hồ sơ cá nhân
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => navigate('/orders')}
                                        className="rounded-lg cursor-pointer gap-2 py-2.5"
                                    >
                                        <Package className="w-4 h-4" /> Đơn hàng
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem
                                        onClick={onLogout}
                                        className="rounded-lg cursor-pointer gap-2 py-2.5 text-error focus:text-error"
                                    >
                                        <LogOut className="w-4 h-4" /> Đăng xuất
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="rounded-xl">
                                    Đăng nhập
                                </Button>
                                <Button size="sm" onClick={() => navigate('/register')} className="rounded-xl">
                                    Đăng ký
                                </Button>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden rounded-xl"
                            onClick={() => setMobileNavOpen((o) => !o)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Navigation bar */}
            <nav className="bg-gradient-to-r from-primary to-primary/90 text-primary-content">
                <div className="container mx-auto px-4 lg:px-6">
                    <div className="hidden lg:flex items-center gap-1 py-2.5">
                        {navLinks.map(({ label, to }) => (
                            <Link
                                key={label}
                                to={to}
                                className="px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:opacity-100 hover:bg-white/10 transition-all"
                            >
                                {label}
                            </Link>
                        ))}

                        {/* Dropdown Tra cứu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:opacity-100 hover:bg-white/10 transition-all inline-flex items-center gap-1 outline-none"
                                >
                                    Tra cứu
                                    <ChevronDown className="w-4 h-4 opacity-90" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-56 rounded-xl shadow-lg border-gray-100 p-1 bg-white"
                            >
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 py-2.5">
                                    <Link to="/warranty" className="flex items-center gap-2 w-full">
                                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                        Tra cứu bảo hành
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:opacity-100 hover:bg-white/10 transition-all inline-flex items-center gap-1 outline-none"
                                >
                                    Thu mua ắc quy
                                    <ChevronDown className="w-4 h-4 opacity-90" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-56 rounded-xl shadow-lg border-gray-100 p-1 bg-white"
                            >
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 py-2.5">
                                    <Link to="/battery-trade-in" className="flex items-center gap-2 w-full">
                                        <Send className="w-4 h-4 text-primary shrink-0" />
                                        Gửi yêu cầu
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 py-2.5">
                                    <Link to="/battery-trade-in/tra-cuu" className="flex items-center gap-2 w-full">
                                        <FileSearch className="w-4 h-4 text-primary shrink-0" />
                                        Tra cứu đơn thu cũ
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 py-2.5">
                                    <Link to="/battery-trade-in/don-cua-toi" className="flex items-center gap-2 w-full">
                                        <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                                        Đơn thu cũ của bạn
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </nav>

            {/* Mobile nav overlay */}
            {mobileNavOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 z-40"
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden="true"
                />
            )}
            <div
                className={`lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg transition-all duration-200 z-50 ${
                    mobileNavOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
            >
                <div className="container mx-auto px-4 py-4 space-y-1">
                    {navLinks.map(({ label, to }) => (
                        <Link
                            key={label}
                            to={to}
                            onClick={() => setMobileNavOpen(false)}
                            className="block px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {label}
                        </Link>
                    ))}
                    {/* Mobile: Tra cứu */}
                    <div className="px-4 pt-1 pb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tra cứu</p>
                        <div className="space-y-0.5 pl-2 border-l-2 border-primary/30">
                            <Link
                                to="/warranty"
                                onClick={() => setMobileNavOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                Tra cứu bảo hành
                            </Link>
                        </div>
                    </div>
                    {/* Mobile: Thu mua ắc quy */}
                    <div className="px-4 pt-1 pb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Thu mua ắc quy</p>
                        <div className="space-y-0.5 pl-2 border-l-2 border-primary/30">
                            <Link
                                to="/battery-trade-in"
                                onClick={() => setMobileNavOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <Send className="w-4 h-4 text-primary shrink-0" />
                                Gửi yêu cầu
                            </Link>
                            <Link
                                to="/battery-trade-in/tra-cuu"
                                onClick={() => setMobileNavOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <FileSearch className="w-4 h-4 text-primary shrink-0" />
                                Tra cứu đơn thu cũ
                            </Link>
                            <Link
                                to="/battery-trade-in/don-cua-toi"
                                onClick={() => setMobileNavOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                                Đơn thu cũ của bạn
                            </Link>
                        </div>
                    </div>
                    {/* Mobile search */}
                    <div className="pt-3 mt-3 border-t border-gray-100">
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSubmitSearch(), setMobileNavOpen(false))}
                                placeholder="Tìm sản phẩm..."
                                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => (handleSubmitSearch(), setMobileNavOpen(false))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
