/**
 * Parse warrantyText từ Product thành số tháng bảo hành.
 *
 * Ví dụ:
 *   "12 tháng"         → 12
 *   "1 năm"            → 12
 *   "6 tháng"          → 6
 *   "1 năm 6 tháng"    → 18
 *   "1year"             → 12
 *   "12 months"          → 12
 *   "" (rỗng)           → 0
 *
 * @param {string} warrantyText - Text bảo hành từ Product.warrantyText
 * @returns {number} Số tháng (0 nếu không parse được)
 */
export function parseWarrantyMonths(warrantyText) {
    if (!warrantyText || typeof warrantyText !== 'string') return 0;

    const text = warrantyText.trim().toLowerCase();

    if (!text) return 0;

    let totalMonths = 0;

    // 1. Tìm "năm" / "year"
    const yearPatterns = [
        /(\d+)\s*(?:năm|year|y)\b/gi,
        /(\d+)\s*(?:nam)\b/gi,        // "1nam" không có khoảng trắng
    ];

    for (const pattern of yearPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > 0) {
                totalMonths += num * 12;
            }
        }
    }

    // 2. Tìm "tháng" / "month" / "th"
    const monthPatterns = [
        /(\d+)\s*(?:tháng|month|tháng\s+găm)\b/gi,
        /(\d+)\s*(?:thang|th)\b/gi,
    ];

    for (const pattern of monthPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > 0) {
                totalMonths += num;
            }
        }
    }

    // 3. Nếu chỉ là số đứng một mình (VD: "12" hoặc "12 tháng")
    if (totalMonths === 0) {
        const numOnly = /^(\d+)$/.exec(text.trim());
        if (numOnly) {
            const num = parseInt(numOnly[1], 10);
            if (!isNaN(num) && num > 0) {
                totalMonths = num;
            }
        }
    }

    return totalMonths;
}

/**
 * Tính ngày kết thúc bảo hành.
 *
 * @param {Date} startDate  - Ngày bắt đầu BH
 * @param {number} months   - Số tháng BH
 * @returns {Date}
 */
export function addMonths(startDate, months) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return date;
}

/**
 * Kiểm tra bảo hành còn hiệu lực không.
 *
 * @param {Date} warrantyEndDate
 * @returns {boolean}
 */
export function isWarrantyActive(warrantyEndDate) {
    return new Date(warrantyEndDate) > new Date();
}
