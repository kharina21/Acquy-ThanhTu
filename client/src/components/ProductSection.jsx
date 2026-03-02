import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from 'react-router';
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";
import "swiper/css/navigation";

export function ProductSection() {
  const [carProducts, setCarProducts] = useState([]);
  const [motorProducts, setMotorProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
            <Link to={`/product/${product._id}`}>
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 cursor-pointer">

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

              </div>
            </Link>
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
