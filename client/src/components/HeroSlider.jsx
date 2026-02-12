import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function NextArrow(props) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 rounded-full p-2 transition-colors"
    >
      <ChevronRight className="w-6 h-6 text-white" />
    </button>
  );
}

function PrevArrow(props) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/30 hover:bg-white/50 rounded-full p-2 transition-colors"
    >
      <ChevronLeft className="w-6 h-6 text-white" />
    </button>
  );
}

export function HeroSlider() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  const slides = [
    {
      id: 1,
      image: 'https://acquyhanoi.vn/wp-content/uploads/2019/02/gs-slider.jpg',
    },
    {
      id: 2,
      image: 'https://acquyhanoi.vn/wp-content/uploads/2019/02/pinaco.jpg',
    },
  ];

  return (
    <div className="relative w-full overflow-hidden">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="outline-none">
            {/* Bỏ chiều cao cố định h-[400px], để ảnh tự quyết định chiều cao theo tỷ lệ */}
            <div className="w-full">
              <img
                src={slide.image}
                alt={`Slide ${slide.id}`}
                className="w-full h-auto object-contain block" 
              />
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
