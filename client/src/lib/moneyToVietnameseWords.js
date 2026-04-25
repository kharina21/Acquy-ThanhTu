const c = 'không một hai ba bốn năm sáu bảy tám chín'.split(' ');

function doc3(n) {
    if (n < 0) return '';
    if (n === 0) return '';
    const t = Math.floor(n / 100);
    const ch = Math.floor((n % 100) / 10);
    const dv = n % 10;
    let s = '';
    if (t > 0) s += c[t] + ' trăm';
    if (t > 0 && ch === 0 && dv > 0) s += (s ? ' ' : '') + 'lẻ';
    if (ch > 0) {
        s += s ? ' ' : '';
        if (ch === 1) s += t ? 'mười' : 'mười';
        else s += c[ch] + ' mươi';
    }
    if (dv > 0) {
        s += s ? ' ' : '';
        if (ch > 0) {
            if (dv === 1 && ch > 1) s += 'mốt';
            else if (dv === 4 && ch > 1) s += 'tư';
            else if (dv === 5 && ch > 0) s += 'lăm';
            else s += c[dv];
        } else s += c[dv];
    }
    return s.trim();
}

const dvBlock = ['', 'nghìn', 'triệu', 'tỷ'];

function docN(n) {
    if (n === 0) return 'không';
    if (n < 0) return '';
    let t = n;
    let i = 0;
    const a = [];
    while (t > 0) {
        const p = t % 1000;
        t = Math.floor(t / 1000);
        if (p) {
            const w = doc3(p);
            a.push(dvBlock[i] ? `${w} ${dvBlock[i]}`.trim() : w);
        }
        i += 1;
    }
    return a.reverse().join(' ').replace(/\s+/g, ' ').trim();
}

/** Số VNĐ nguyên → bằng chữ (đồng chẵn) */
export function moneyToVietnameseWords(n) {
    if (n == null || !Number.isFinite(n)) return '';
    const v = Math.max(0, Math.min(9_999_999_999_999, Math.floor(n)));
    if (v === 0) return 'Không đồng';
    const t = docN(v);
    return t.charAt(0).toUpperCase() + t.slice(1) + ' đồng chẵn';
}
