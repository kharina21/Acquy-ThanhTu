/**
 * Gộp cột NXT dạng sổ: nhập kỳ = nhập kho + phần lệch kiểm kho dương;
 * xuất kỳ = xuất phiếu + trả NCC + phần lệch kiểm kho âm.
 * Đảm bảo: tồn đầu + nhập kỳ − xuất kỳ = tồn cuối (theo dữ liệu API).
 */
export function nxtPeriodInbound(r) {
    const adj = Number(r.stockCheckAdjustment) || 0;
    const nhap = Number(r.inboundQty) || 0;
    return nhap + Math.max(0, adj);
}

export function nxtPeriodOutbound(r) {
    const adj = Number(r.stockCheckAdjustment) || 0;
    const xuat = Number(r.outboundQty) || 0;
    const tra = Number(r.returnToSupplierQty) || 0;
    return xuat + tra + Math.max(0, -adj);
}

/** Hiển thị số hoặc "—" khi 0 (giống bảng Excel mẫu). */
export function formatNxtQtyCell(n) {
    const v = Number(n) || 0;
    if (v === 0) return '—';
    return v;
}
