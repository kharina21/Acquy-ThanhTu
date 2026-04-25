import StoreSettings from '../models/StoreSettings.js';

async function getOrCreateSettings() {
    let s = await StoreSettings.findOne();
    if (!s) {
        s = await StoreSettings.create({ defaultVatPercent: 10 });
    }
    return s;
}

export const getStoreSettings = async (req, res) => {
    try {
        const s = await getOrCreateSettings();
        res.status(200).json({
            success: true,
            data: {
                defaultVatPercent: s.defaultVatPercent,
                taxCode: s.taxCode != null ? String(s.taxCode) : '',
                updatedAt: s.updatedAt,
            },
        });
    } catch (error) {
        console.error('getStoreSettings error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tải cài đặt cửa hàng', error: error.message });
    }
};

export const updateStoreSettings = async (req, res) => {
    try {
        const body = req.body || {};
        const raw = body.defaultVatPercent;
        const n = Number(raw);
        if (Number.isNaN(n) || n < 0 || n > 100) {
            return res.status(400).json({ message: 'VAT mặc định phải là số từ 0 đến 100 (%)' });
        }
        let s = await StoreSettings.findOne();
        if (!s) {
            s = await StoreSettings.create({ defaultVatPercent: n, taxCode: '' });
        } else {
            s.defaultVatPercent = Math.round(n * 100) / 100;
        }
        if (Object.prototype.hasOwnProperty.call(body, 'taxCode')) {
            s.taxCode = String(body.taxCode ?? '')
                .trim()
                .slice(0, 20);
        }
        await s.save();
        res.status(200).json({
            success: true,
            data: {
                defaultVatPercent: s.defaultVatPercent,
                taxCode: s.taxCode != null ? String(s.taxCode) : '',
                updatedAt: s.updatedAt,
            },
            message: 'Đã cập nhật cài đặt thuế / MST',
        });
    } catch (error) {
        console.error('updateStoreSettings error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lưu cài đặt cửa hàng', error: error.message });
    }
};
