import React, { useEffect, useState, } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const ListProduct = () => {
    const { user, logout } = useAuthStore();
    const { userRoles } = useUserRole();

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
    }, [page]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(
                `http://localhost:5000/api/products?page=${page}&limit=${limit}`
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
                <div className="grid grid-cols-3 gap-6">
                    {products.map((p) => (
                        <div
                            key={p._id}
                            className="bg-white shadow hover:shadow-lg transition p-4 text-center"
                        >
                            <img
                                src={p.images?.[0]}
                                alt={p.name}
                                className="h-40 mx-auto object-contain mb-4"
                            />

                            <h3 className="text-sm font-medium mb-2">
                                {p.name}
                            </h3>

                            <p className="text-red-600 font-bold">
                                {p.price?.toLocaleString()} đ
                            </p>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center mt-8 gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="px-3 py-1 border bg-white disabled:opacity-50"
                    >
                        Trước
                    </button>

                    {getPageNumbers().map((p, index) => (
                        <button
                            key={index}
                            disabled={p === "..."}
                            onClick={() => typeof p === "number" && setPage(p)}
                            className={`px-3 py-1 border ${page === p
                                    ? "bg-blue-600 text-white"
                                    : "bg-white"
                                } ${p === "..." ? "cursor-default" : ""}`}
                        >
                            {p}
                        </button>
                    ))}

                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-3 py-1 border bg-white disabled:opacity-50"
                    >
                        Sau
                    </button>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default ListProduct;