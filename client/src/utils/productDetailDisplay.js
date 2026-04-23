/** Nhãn cho batteryType từ API */
export function labelBatteryType(t, emptyLabel = '—') {
    if (t === 'dry') return 'Khô';
    if (t === 'wet') return 'Nước';
    return emptyLabel;
}

export function formatDimensionsMm(p, emptyLabel = '—') {
    if (!p) return emptyLabel;
    const l = p.dimensionLengthMm;
    const w = p.dimensionWidthMm;
    const h = p.dimensionHeightMm;
    if (l == null && w == null && h == null) return emptyLabel;
    const dash = emptyLabel;
    const a = l != null && Number.isFinite(Number(l)) ? `${l}` : dash;
    const b = w != null && Number.isFinite(Number(w)) ? `${w}` : dash;
    const c = h != null && Number.isFinite(Number(h)) ? `${h}` : dash;
    return `${a} × ${b} × ${c} mm`;
}

export function formatWeightKg(v, emptyLabel = '—') {
    if (v == null || v === '' || !Number.isFinite(Number(v))) return emptyLabel;
    return `${Number(v)} kg`;
}

export function formatVoltageV(v, emptyLabel = '—') {
    if (v == null || v === '' || !Number.isFinite(Number(v))) return emptyLabel;
    return `${Number(v)} V`;
}
