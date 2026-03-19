/**
 * VietQR Quick Link – tạo URL ảnh QR từ img.vietqr.io (không cần API key).
 * Map bank code (MB, VCB, ...) sang bin (970422, 970436, ...).
 * Tham khảo: https://api.vietqr.io/v2/banks
 */
const BANK_CODE_TO_BIN = {
    ICB: '970415',
    VCB: '970436',
    BIDV: '970418',
    VBA: '970405',
    OCB: '970448',
    MB: '970422',
    TCB: '970407',
    ACB: '970416',
    VPB: '970432',
    TPB: '970423',
    STB: '970403',
    HDB: '970437',
    SCB: '970429',
    VIB: '970441',
    SHB: '970443',
    MSB: '970426',
    EIB: '970431',
    PVCB: '970412',
    NCB: '970419',
    VAB: '970427',
    NAB: '970428',
    PGB: '970430',
    VIETBANK: '970433',
    BVB: '970438',
    SEAB: '970440',
    LPB: '970449',
    KLB: '970452',
    BAB: '970409',
    SGICB: '970400',
    CBB: '970444',
    CIMB: '422589',
};

// Chuẩn hóa tên tài khoản: tiếng Việt không dấu, viết hoa, 5-50 ký tự (yêu cầu VietQR)
const normalizeAccountName = (name) => {
    const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
    const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
    let s = String(name || '').trim();
    for (let i = 0; i < from.length; i++) s = s.replace(new RegExp(from[i], 'gi'), to[i]);
    s = s.replace(/[^\w\s]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
    s = s.slice(0, 50).trim();
    return s.length >= 5 ? s : 'CHU TAI KHOAN';
};

// Nếu bankCode đã là 6 chữ số (bin) thì dùng luôn
const getBankBin = (bankCode) => {
    if (!bankCode) return '';
    const code = String(bankCode).trim().toUpperCase();
    if (/^\d{6}$/.test(code)) return code;
    return BANK_CODE_TO_BIN[code] || code;
};

/**
 * Tạo Quick Link (URL ảnh QR) - không cần API key.
 * Format: https://img.vietqr.io/image/{BANK}-{ACCOUNT}-{TEMPLATE}.png?amount=&addInfo=&accountName=
 */
export const getVietQRQuickLink = ({ bankCode, accountNumber, accountName, amount, memo = '' }) => {
    const bin = getBankBin(bankCode);
    const accNo = String(accountNumber || '').trim();
    const amountStr = String(Math.round(Number(amount) || 0));
    const memoClean = String(memo).replace(/[^\w\s]/g, '').slice(0, 50).trim() || 'Thanh toan';
    const nameClean = normalizeAccountName(accountName);
    const params = new URLSearchParams();
    if (amountStr) params.set('amount', amountStr);
    if (memoClean) params.set('addInfo', memoClean);
    if (nameClean) params.set('accountName', nameClean);
    const qs = params.toString();
    return `https://img.vietqr.io/image/${bin}-${accNo}-qr_only.png${qs ? `?${qs}` : ''}`;
};
