/**
 * Overlay hiển thị khi sản phẩm hết hàng.
 * Dùng cho product card - làm mờ và chặn tương tác.
 */
export function SoldOutOverlay({ className = '' }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center bg-black/40 pointer-events-auto ${className}`}
      aria-hidden="true"
    >
      <img
        src="/assets/sold_out.png"
        alt="Hết hàng"
        className="max-w-[80%] max-h-[60%] object-contain drop-shadow-lg"
      />
    </div>
  );
}
