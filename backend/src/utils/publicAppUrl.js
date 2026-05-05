/**
 * Origin công khai của app — PayOS returnUrl/cancelUrl, link email.
 *
 * Production: PUBLIC_APP_URL → RENDER_EXTERNAL_URL → FRONTEND_URL (chỉ khi **không** phải localhost).
 * Tránh lỗi copy `FRONTEND_URL=http://localhost:5173` từ .env dev lên Render khiến PayOS redirect về localhost.
 *
 * Development: FRONTEND_URL hoặc mặc định http://localhost:5173 (Vite).
 */

const stripTrailingSlash = (s) => String(s || '').trim().replace(/\/$/, '');

/** localhost / 127.0.0.1 — không dùng làm URL công khai trên production */
function isLocalhostOrigin(url) {
    if (!url) return false;
    try {
        const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
        const u = new URL(withProto);
        const h = u.hostname.toLowerCase();
        return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]';
    } catch {
        return false;
    }
}

export function getPublicAppOrigin() {
    const publicApp = stripTrailingSlash(process.env.PUBLIC_APP_URL);
    const renderExternal = stripTrailingSlash(process.env.RENDER_EXTERNAL_URL);
    const frontend = stripTrailingSlash(process.env.FRONTEND_URL);
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        const candidates = [publicApp, renderExternal, frontend];
        for (const c of candidates) {
            if (c && !isLocalhostOrigin(c)) return c;
        }
        console.warn(
            '[getPublicAppOrigin] Production: không có URL công khai hợp lệ. Đặt PUBLIC_APP_URL hoặc để Render tự set RENDER_EXTERNAL_URL; không dùng FRONTEND_URL=localhost trên server.',
        );
        return '';
    }

    return frontend || 'http://localhost:5173';
}

/**
 * Base URL cho link trong email / reset mật khẩu khi `getPublicAppOrigin` rỗng (cấu hình sai).
 */
export function resolveFrontendBaseForLinks() {
    const o = getPublicAppOrigin();
    if (o) return o;
    return stripTrailingSlash(process.env.FRONTEND_URL) || 'http://localhost:5173';
}
