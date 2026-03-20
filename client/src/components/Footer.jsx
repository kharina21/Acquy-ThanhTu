import { Link } from 'react-router';
import { Phone, ArrowUp } from 'lucide-react';

const HOTLINE = '0989387378';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-primary text-primary-content mt-auto">
      {/* Hotline Bar */}
      <div className="bg-primary/90 py-2.5">
        <div className="container mx-auto px-4 text-center">
          <a href={`tel:${HOTLINE}`} className="italic font-bold text-lg hover:opacity-90 transition-opacity text-primary-content">
            Hotline: <span>{HOTLINE.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}</span>
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Cột 1: Về chúng tôi */}
          <div className="text-sm leading-relaxed">
            <h3 className="font-bold text-base mb-4 border-b border-primary-content/30 pb-2 inline-block">VỀ CHÚNG TÔI</h3>
            <div className="space-y-1.5 text-primary-content/90">
              <p className="font-bold uppercase">Đại lý Ắc Quy Thanh Tú</p>
              <p>Mã số thuế: 0109466751</p>
              <p>Nơi cấp: Sở Kế hoạch và Đầu tư TP Hà Nội</p>
              <p>Ngày cấp: 22-12-2020</p>
              <p>Đại diện: Vũ Thanh Tú</p>
              <p>Email: vuthanhtu070378@gmail.com</p>
              <p>Showroom: 278 Hồ Tùng Mậu – Bắc Từ Liêm</p>
              <p>CS2: Số 1 ngõ 304 Hồ Tùng Mậu – Bắc Từ Liêm</p>
              <p>CS3: Số 89 Võ Chí Công – Xuân La – Tây Hồ</p>
              <p>Hotline: {HOTLINE.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}</p>
            </div>
          </div>

          {/* Cột 2: Danh mục */}
          <div className="text-sm">
            <h3 className="font-bold text-base mb-4 border-b border-primary-content/30 pb-2 inline-block">DANH MỤC</h3>
            <ul className="space-y-2.5">
              <li><Link to="/listproduct" className="text-primary-content/90 hover:text-primary-content hover:underline transition-colors">Sản phẩm</Link></li>
              <li><Link to="/" className="text-primary-content/90 hover:text-primary-content hover:underline transition-colors">Trang chủ</Link></li>
              <li><a href="#" className="text-primary-content/90 hover:text-primary-content hover:underline transition-colors">Thu mua ắc quy cũ</a></li>
              <li><a href="#" className="text-primary-content/90 hover:text-primary-content hover:underline transition-colors">Liên hệ</a></li>
            </ul>
          </div>

          {/* Cột 3: Bản đồ */}
          <div>
            <h3 className="font-bold text-base mb-4 border-b border-primary-content/30 pb-2 inline-block">BẢN ĐỒ</h3>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-primary-content/20">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.8966453621434!2d105.7725833!3d21.0368144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313454b322307567%3A0x6a0a09c258674d81!2zMjc4IEjhu5MgVMO5bmcgTeG6rXUsIFBow7ogRGnhu4VuLCBC4bqvYyBU4burIExpw6ptLCBIw6AgTuG7mWksIFZpZXRuYW0!5e0!3m2!1svi!2s!4v1715000000000!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="Bản đồ"
              />
            </div>
          </div>

          {/* Cột 4: Chứng nhận */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="font-bold text-base mb-4 border-b border-primary-content/30 pb-2 inline-block">CHỨNG NHẬN</h3>
            <a
              href="http://online.gov.vn/Website/chi-tiet-133245?AspxAutoDetectCookieSupport=1"
              target="_blank"
              rel="noreferrer"
              className="block hover:opacity-90 transition-opacity"
            >
              <img
                src="https://dangkywebvoibocongthuong.com/wp-content/uploads/2021/11/logo-da-thong-bao-bo-cong-thuong.png"
                alt="Đã thông báo Bộ Công Thương"
                className="w-full max-w-[200px] h-auto object-contain"
              />
            </a>
            <p className="mt-3 text-xs text-primary-content/70 italic text-center md:text-left">
              Website đã đăng ký với Bộ Công Thương.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-primary/95 py-4 border-t border-primary-content/10">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-primary-content/80">
          <div className="flex gap-6">
            <Link to="/listproduct" className="hover:text-primary-content transition-colors">Sản phẩm</Link>
            <a href="#" className="hover:text-primary-content transition-colors">Liên hệ</a>
          </div>
          <p className="text-primary-content/60">© 2026 acquyhanoi.vn</p>
        </div>
      </div>

      {/* Floating: Gọi & Cuộn lên */}
      <div className="fixed right-4 bottom-6 flex flex-col gap-2 z-50">
        <a
          href={`tel:${HOTLINE}`}
          className="bg-primary text-primary-content p-3 rounded-full shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
          aria-label="Gọi hotline"
        >
          <Phone className="w-5 h-5" />
        </a>
        <button
          onClick={scrollToTop}
          className="bg-primary/80 text-primary-content p-3 rounded-full hover:bg-primary transition-colors"
          aria-label="Cuộn lên đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
}

export default Footer;