import { createPortal } from 'react-dom';

/**
 * Render modal vào document.body để lớp phủ fixed không bị cắt bởi layout overflow/drawer
 * (tránh vạch/khoảng nền đen phía dưới khi mở modal).
 */
export default function ModalPortal({ children }) {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}
