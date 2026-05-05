/**
 * Origin công khai của app (HTTPS trên production) — dùng cho PayOS returnUrl / cancelUrl, email link.
 * Thứ tự: PUBLIC_APP_URL → FRONTEND_URL → RENDER_EXTERNAL_URL (Render tự set) → localhost dev.
 */
export function getPublicAppOrigin() {
    const raw =
        process.env.PUBLIC_APP_URL ||
        process.env.FRONTEND_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        '';
    const trimmed = String(raw).trim().replace(/\/$/, '');
    if (trimmed) return trimmed;
    if (process.env.NODE_ENV !== 'production') {
        return 'http://localhost:5173';
    }
    console.warn(
        '[getPublicAppOrigin] Set PUBLIC_APP_URL or FRONTEND_URL on production; PayOS return URL may be wrong.',
    );
    return '';
}
