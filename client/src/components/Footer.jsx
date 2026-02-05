import { Phone, ArrowUp } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#005bab] text-white">
      {/* Hotline Bar */}
      <div className="bg-[#004a8c] py-2">
        <div className="container mx-auto px-4 text-center">
          <p className="italic font-bold text-lg">
            Hotline : <span className="text-white">0989 387 378</span>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Cột 1: Về chúng tôi */}
          <div className="text-[13px] leading-relaxed">
            <h3 className="font-bold text-[15px] mb-4 border-b border-blue-400 pb-2 inline-block">VỀ CHÚNG TÔI</h3>
            <div className="space-y-1">
              <p className="font-bold uppercase">Đại lý Ắc Quy Thanh Tú</p>
              <p>Mã Số Thuế : 0109466751</p>
              <p>Nơi Cấp : Sở Kế Hoạch Và Đầu Tư Thành Phố Hà Nội</p>
              <p>Ngày Cấp : 22-12-2020</p>
              <p>Đại Diện : Vũ Thanh Tú</p>
              <p>Email : vuthanhtu070378@gmail.com</p>
              <p>Showroom : 278 Hồ Tùng Mậu – Bắc Từ Liêm</p>
              <p>Cs2: Số 1 ngõ 304 Hồ Tùng Mậu – Bắc Từ Liêm</p>
              <p>CS3: Số 89 Võ Chí Công – Xuân La – Tây Hồ</p>
              <p>Hotline: 0989 387 378</p>
              <p className="font-bold">0989 387 378 Khu vực Tây Hồ – Cầu Giấy – Hà Đông</p>
              <p className="font-bold">0989 387 378 Khu vực Bắc Từ Liêm – Nam Từ Liêm – Hoài Đức</p>
            </div>
          </div>

          {/* Cột 2: Danh mục sản phẩm */}
          <div className="text-[13px]">
            <h3 className="font-bold text-[15px] mb-4 border-b border-blue-400 pb-2 inline-block">DANH MỤC SẢN PHẨM</h3>
            <ul className="space-y-3">
              <li className="hover:underline cursor-pointer">Ắc quy Ô tô</li>
              <li className="hover:underline cursor-pointer">Ắc Quy Dân dụng</li>
              <li className="hover:underline cursor-pointer">Sạc Ắc Quy</li>
              <li className="hover:underline cursor-pointer">Thu mua Ắc quy cũ</li>
              <li className="hover:underline cursor-pointer">Quy định vận chuyển và hình thức thanh toán</li>
              <li className="hover:underline cursor-pointer">Quy định và hình thức thanh toán</li>
              <li className="hover:underline cursor-pointer">Chính sách đổi/trả hàng và hoàn tiền</li>
              <li className="hover:underline cursor-pointer">Chính sách kiểm hàng và bảo hành</li>
              <li className="hover:underline cursor-pointer">Chính sách bảo mật</li>
            </ul>
          </div>

          {/* Cột 3: Bản đồ */}
          <div>
            <h3 className="font-bold text-[15px] mb-4 border-b border-blue-400 pb-2 inline-block">BẢN ĐỒ</h3>
            <div className="w-full h-48 rounded overflow-hidden border border-blue-400">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.8966453621434!2d105.7725833!3d21.0368144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313454b322307567%3A0x6a0a09c258674d81!2zMjc4IEjhu5MgVMO5bmcgTeG6rXUsIFBow7ogRGnhu4VuLCBC4bqvYyBU4burIExpw6ptLCBIw6AgTuG7mWksIFZpZXRuYW0!5e0!3m2!1svi!2s!4v1715000000000!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>

          {/* Cột 4: Facebook & Bộ Công Thương */}
          <div className="flex flex-col items-center md:items-start justify-start">
            <h3 className="font-bold text-[15px] mb-6 border-b border-blue-400 pb-2 inline-block">CHỨNG NHẬN</h3>

            <div className="w-full">
              <a
                href="http://online.gov.vn/Website/chi-tiet-133245?AspxAutoDetectCookieSupport=1"
                target="_blank"
                rel="noreferrer"
                className="block hover:scale-105 transition-transform duration-300"
              >
                <img
                  src="https://dangkywebvoibocongthuong.com/wp-content/uploads/2021/11/logo-da-thong-bao-bo-cong-thuong.png"
                  alt="Đã thông báo bộ công thương"
                  className="w-full max-w-[220px] h-auto object-contain block mx-auto md:mx-0"
                /* w-full và max-w-[220px] giúp logo to ra rõ rệt */
                />
              </a>
            </div>

            {/* Bạn có thể thêm một dòng chữ nhỏ dưới logo nếu muốn giống các web lớn */}
            <p className="mt-4 text-[11px] text-blue-200 italic text-center md:text-left">
              Website đã được đăng ký chính thức với Bộ Công Thương.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="bg-black py-4 border-t border-gray-800">
        <div className="container mx-auto px-4 flex flex-col md:row justify-between items-center gap-4 text-[12px]">
          <div className="flex gap-4 font-bold">
            <span className="hover:text-blue-400 cursor-pointer">TIN TỨC</span>
            <span className="hover:text-blue-400 cursor-pointer">LIÊN HỆ</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <p className="text-gray-400 italic">Copyright 2026 © acquyhanoi.vn</p>
            <div className="flex gap-1">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-5 bg-white px-1 rounded" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5 bg-white px-1 rounded" alt="Paypal" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-5 bg-white px-1 rounded" alt="Stripe" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Buttons */}
      <div className="fixed right-4 bottom-6 flex flex-col gap-3 z-50">
        <a href="tel:0989387378" className="bg-[#00aff0] p-3 rounded-full shadow-lg animate-bounce">
          <Phone className="w-6 h-6 text-white" fill="currentColor" />
        </a>
        <a href="tel:0989387378" className="bg-[#00aff0] p-3 rounded-full shadow-lg">
          <Phone className="w-6 h-6 text-white" fill="currentColor" />
        </a>
        <button
          onClick={scrollToTop}
          className="bg-black/50 p-3 rounded-full text-white hover:bg-black transition-colors"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      </div>
    </footer>
  );
}

export default Footer;