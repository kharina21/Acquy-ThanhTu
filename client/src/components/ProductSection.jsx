import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserRole } from "@/hooks/useUserRole";

import "swiper/css";
import "swiper/css/navigation";

export function ProductSection() {
  const [carProducts, setCarProducts] = useState([]);
  const [motorProducts, setMotorProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const accessToken = useAuthStore((s) => s.accessToken);
  const { hasAnyRole } = useUserRole();
  const addToCartServer = useCartStore((s) => s.addToCartServer);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const [carRes, motorRes] = await Promise.all([
        axios.get("http://localhost:5000/api/products/car-batteries"),
        axios.get("http://localhost:5000/api/products/motorcycle-batteries"),
      ]);

      if (carRes.data.success) {
        setCarProducts(carRes.data.data.products.slice(0, 5));
      }

      if (motorRes.data.success) {
        setMotorProducts(motorRes.data.data.products.slice(0, 5));
      }
    } catch (error) {
      console.error("Lỗi lấy sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product, goToCart = false) => {
    // Bắt buộc đăng nhập
    if (!accessToken) {
      toast.info("Vui lòng đăng nhập để mua hàng.");
      navigate("/login");
      return;
    }

    // Chỉ cho role 'user' hoặc 'Người dùng thường' được mua hàng
    if (!hasAnyRole('user', 'Người dùng thường')) {
      toast.error("Tài khoản hiện tại không có quyền mua hàng.");
      return;
    }

    try {
      await addToCartServer(product._id, 1);
      toast.success("Đã thêm vào giỏ hàng");
      if (goToCart) {
        navigate("/cart");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Lỗi khi thêm vào giỏ hàng";
      toast.error(msg);
    }
  };

  const renderSection = (title, products, sectionKey) => (
    <div className="mb-12 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link
          to="/listproduct"
          className="text-red-500 border border-red-500 px-4 py-1 rounded hover:bg-red-500 hover:text-white transition"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Navigation Buttons */}
      <button
        className={`prev-${sectionKey} absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow p-2 rounded-full`}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        className={`next-${sectionKey} absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow p-2 rounded-full`}
      >
        <ChevronRight size={20} />
      </button>

      {/* Swiper */}
      <Swiper
        modules={[Navigation, Autoplay]}
        loop={true}
        slidesPerView={4}
        spaceBetween={20}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        navigation={{
          nextEl: `.next-${sectionKey}`,
          prevEl: `.prev-${sectionKey}`,
        }}
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 4 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product._id}>
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col">
              <Link to={`/product/${product._id}`} className="block">
                <div className="aspect-square bg-gray-100 rounded mb-3 overflow-hidden flex items-center justify-center">
                  {(product.images?.[0] || product.image) ? (
                    <img
                      src={product.images?.[0] || product.image}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Không có ảnh
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px]">
                  {product.name}
                </h3>

                <div className="mt-2">
                  <span className="text-red-600 font-bold text-lg">
                    {product.price?.toLocaleString()}đ
                  </span>
                </div>
              </Link>

              {/* Nút Mua hàng + Thêm vào giỏ */}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleAddToCart(product, true)}
                >
                  Mua hàng
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => handleAddToCart(product, false)}
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );

  return (
    <div className="py-10 bg-gray-100">
      <div className="container mx-auto px-4">
        {loading ? (
          <p>Đang tải sản phẩm...</p>
        ) : (
          <>
            {renderSection("🚗 ẮC QUY Ô TÔ", carProducts, "car")}
            {renderSection("🏍 ẮC QUY XE MÁY", motorProducts, "motor")}
          </>
        )}
      </div>
    </div>
  );
}
