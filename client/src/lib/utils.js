import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Tính hạng khách hàng dựa trên accumulatedAmount và danh sách MemberPolicy.
 * Policies nên được sắp xếp theo minTotalSpent tăng dần.
 * Trả về policy.name của hạng cao nhất mà khách đạt được, hoặc null nếu không có.
 */
export function getCustomerTier(accumulatedAmount, policies) {
    const policy = getCustomerPolicy(accumulatedAmount, policies);
    return policy?.name ?? null;
}

/**
 * Trả về policy object đầy đủ (name, discountPercent, ...) của hạng cao nhất khách đạt được.
 * Dùng để lấy discountPercent áp dụng giảm giá.
 */
export function getCustomerPolicy(accumulatedAmount, policies) {
    if (!Array.isArray(policies) || policies.length === 0) return null;
    const amount = Number(accumulatedAmount) || 0;
    const active = policies.filter((p) => p.isActive !== false);
    /** Luôn xét theo ngưỡng tăng dần để bậc cao nhất đạt được là bản ghi cuối cùng thỏa điều kiện. */
    const sorted = [...active].sort((a, b) => (Number(a.minTotalSpent) || 0) - (Number(b.minTotalSpent) || 0));
    let matched = null;
    for (const p of sorted) {
        if (amount >= (Number(p.minTotalSpent) || 0)) {
            matched = p;
        }
    }
    return matched;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * URL gốc của SPA trên đúng host hiện tại (dev: localhost, production: domain thật).
 * Dùng cho link "Về trang chủ" trên trang lỗi; tránh gắn URL tĩnh một môi trường.
 */
export function getClientAppHomeUrl() {
    if (typeof window === 'undefined') return '/';
    const base = import.meta.env.BASE_URL || '/';
    const path = base.endsWith('/') ? base : `${base}/`;
    return `${window.location.origin}${path}`;
}


// Lấy tên hiển thị của người dùng (firstName + lastName hoặc username)
export const getDisplayName = (user) => {
  if (!user) return '';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();
  return user.username || '';
};

// Lấy chữ cái đầu tiên của tên người dùng
export const getInitials = (user) => {
  if (!user) return 'U';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (lastName) return lastName.charAt(0).toUpperCase();
  if (user.username) return user.username.charAt(0).toUpperCase();
  return 'U';
};

// Lấy role đầu tiên của người dùng
export const getPrimaryRole = (user) => {
  if (!user || !user.roles || user.roles.length === 0) return '';
  return user.roles[0].name || '';
};


export const formatDate = (dateString) => {
  if (!dateString) return 'Chưa có thông tin';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format VND currency
export const formatVND = (num) => {
  if (num == null || isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};