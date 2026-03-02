import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";

export function ProductSection() {
  const [carProducts, setCarProducts] = useState([]);
  const [motorProducts, setMotorProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.addToCart);

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

  const renderSection = (title, products) => (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button className="text-red-500 border border-red-500 px-4 py-1 rounded hover:bg-red-500 hover:text-white transition">
          Xem tất cả →
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {products.map((product) => (
          <div
            key={product._id}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col"
          >
            {/* Image */}
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

            {/* Name */}
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px]">
              {product.name}
            </h3>

            {/* Price */}
            <div className="mt-2">
              <span className="text-red-600 font-bold text-lg">
                {product.price?.toLocaleString()}đ
              </span>
            </div>

            {/* Nút Mua hàng + Thêm vào giỏ */}
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  addToCart(product, 1);
                  navigate("/cart");
                }}
              >
                Mua hàng
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  addToCart(product, 1);
                  toast.success("Đã thêm vào giỏ");
                }}
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="py-10 bg-gray-100">
      <div className="container mx-auto px-4">
        {loading ? (
          <p>Đang tải sản phẩm...</p>
        ) : (
          <>
            {renderSection("🚗 ẮC QUY Ô TÔ", carProducts)}
            {renderSection("🏍 ẮC QUY XE MÁY", motorProducts)}
          </>
        )}
      </div>
    </div>
  );
}
