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
    let matched = null;
    for (const p of active) {
        if (amount >= (p.minTotalSpent ?? 0)) {
            matched = p;
        }
    }
    return matched;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


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