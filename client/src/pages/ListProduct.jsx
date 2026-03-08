import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { useSearchParams } from "react-router";

const ListProduct = () => {
    const { user, logout } = useAuthStore();
    const { hasAnyRole } = useUserRole();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const search = searchParams.get("search")   || "";
    const accessToken = useAuthStore((s) => s.accessToken);
    const addToCartServer = useCartStore((s) => s.addToCartServer);

    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 15;

    useEffect(() => {
        fetchProducts();
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [page, search]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(
                `http://localhost:5000/api/products?page=${page}&limit=${limit}&search=${search}`
            );

            setProducts(res.data.data.products);
            setTotalPages(res.data.data.pagination.totalPages);
        } catch (error) {
            toast.error('Lỗi khi tải sản phẩm');
            console.error(error);
        }
    };
    const getPageNumbers = () => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (page > 3) {
                pages.push("...");
            }

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (page < totalPages - 2) {
                pages.push("...");
            }

            pages.push(totalPages);
        }

        return pages;
    };

    const handleLogin = (email, password) => {
        toast.success(`Đang đăng nhập với: ${email} !`);
    };

    const handleRegister = (name, email, password) => {
        toast.success(`Đăng ký cho: ${name} !`);
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
            console.error(error);
        }
    };

    const handleAddToCart = async (product, goToCart = false) => {
        if (!accessToken) {
            toast.info('Vui lòng đăng nhập để mua hàng.');
            navigate('/login');
            return;
        }
        if (!hasAnyRole('user', 'Người dùng thường')) {
            toast.error('Tài khoản hiện tại không có quyền mua hàng.');
            return;
        }
        try {
            await addToCartServer(product._id, 1);
            toast.success('Đã thêm vào giỏ hàng');
            if (goToCart) {
                navigate('/cart');
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Lỗi khi thêm vào giỏ hàng';
            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Header
                user={user}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
            />

            <div className="container mx-auto px-4 py-8">

                {/* Title */}
                <h2 className="text-2xl font-bold mb-6">Sản phẩm</h2>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p) => (
                        <div
                            key={p._id}
                            className="bg-white shadow hover:shadow-lg transition p-4 text-center flex flex-col"
                        >
                            <Link
                                to={`/product/${p._id}`}
                                className="block flex-1"
                            >
                                <img
                                    src={p.images?.[0]}
                                    alt={p.name}
                                    className="h-40 mx-auto object-contain mb-4"
                                />

                                <h3 className="text-sm font-medium mb-2 hover:text-red-600">
                                    {p.name}
                                </h3>

                                <p className="text-red-600 font-bold">
                                    {p.price?.toLocaleString()} đ
                                </p>
                            </Link>

                            {/* Nút Mua ngay + Thêm vào giỏ hàng */}
                            <div className="mt-3 flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleAddToCart(p, true)}
                                >
                                    Mua ngay
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleAddToCart(p, false)}
                                >
                                    <ShoppingCart className="w-4 h-4 mr-1 shrink-0" />
                                    Thêm vào giỏ hàng
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center mt-10 gap-2 flex-wrap">

                    {/* Prev */}
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 transition
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        ← Trước
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((p, index) => (
                        <button
                            key={index}
                            disabled={p === "..."}
                            onClick={() => typeof p === "number" && setPage(p)}
                            className={`
                px-4 py-2 rounded-lg border transition cursor-pointer
                ${page === p
                                    ? "bg-red-600 text-white border-red-600 shadow-md"
                                    : "bg-white hover:bg-gray-100"
                                }
                ${p === "..." ? "cursor-default border-none bg-transparent" : ""}
                disabled:cursor-not-allowed
            `}
                        >
                            {p}
                        </button>
                    ))}

                    {/* Next */}
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 transition
                   disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Sau →
                    </button>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default ListProduct;