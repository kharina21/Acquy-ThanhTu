/**
 * Danh sách ngân hàng từ VietQR (public API), cache ngắn để giảm tải.
 */

const VIETQR_BANKS_URL = 'https://api.vietqr.io/v2/banks';
const CACHE_TTL_MS = 60 * 60 * 1000;

let banksCache = { at: 0, banks: null };

export const getVietQrBanksPublic = async (req, res) => {
    try {
        const now = Date.now();
        if (banksCache.banks && now - banksCache.at < CACHE_TTL_MS) {
            return res.status(200).json({ success: true, data: { banks: banksCache.banks } });
        }
        const r = await fetch(VIETQR_BANKS_URL, { method: 'GET' });
        if (!r.ok) {
            return res.status(502).json({ message: `VietQR banks HTTP ${r.status}` });
        }
        const json = await r.json();
        if (json.code !== '00' || !Array.isArray(json.data)) {
            return res.status(502).json({ message: json.desc || 'Không đọc được danh sách ngân hàng' });
        }
        const banks = json.data
            .map((b) => ({
                id: b.id,
                name: b.name,
                code: b.code,
                bin: String(b.bin || ''),
                shortName: b.shortName || b.short_name || '',
            }))
            .sort((a, b) =>
                String(a.shortName || a.name).localeCompare(String(b.shortName || b.name), 'vi', {
                    sensitivity: 'base',
                })
            );
        banksCache = { at: now, banks };
        return res.status(200).json({ success: true, data: { banks } });
    } catch (error) {
        console.error('getVietQrBanksPublic error:', error.message);
        return res.status(502).json({
            message: 'Không tải được danh sách ngân hàng',
            error: error.message,
        });
    }
};
