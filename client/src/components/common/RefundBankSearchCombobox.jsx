import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2 } from 'lucide-react';

function stripAccents(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Chọn ngân hàng có ô tìm kiếm; chọn xong điền tên đầy đủ + BIN (6 số).
 */
export default function RefundBankSearchCombobox({
    bankName,
    bankBin,
    onBankChange,
    banks = [],
    loading = false,
    loadError = false,
    onRetry,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const btnRef = useRef(null);
    const panelRef = useRef(null);
    const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 280 });

    const filtered = useMemo(() => {
        const q = stripAccents(search.trim());
        const qDigits = search.replace(/\D/g, '');
        if (!banks.length) return [];
        if (!q && !qDigits) return banks.slice(0, 120);
        return banks
            .filter((b) => {
                const name = stripAccents(b.name);
                const shortN = stripAccents(b.shortName);
                const code = String(b.code || '').toLowerCase();
                const bin = String(b.bin || '');
                return (
                    name.includes(q) ||
                    shortN.includes(q) ||
                    code.includes(q) ||
                    (qDigits && bin.includes(qDigits))
                );
            })
            .slice(0, 150);
    }, [banks, search]);

    const updateMenuPosition = () => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const w = Math.min(Math.max(r.width, 260), window.innerWidth - 16);
        let left = r.left;
        if (left + w > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - w - 8);
        }
        const maxH = 280;
        let top = r.bottom + 6;
        if (top + maxH > window.innerHeight - 8) {
            top = Math.max(8, r.top - maxH - 6);
        }
        setMenuRect({ top, left, width: w });
    };

    useEffect(() => {
        if (!open) return;
        updateMenuPosition();
        const onScroll = () => updateMenuPosition();
        const onResize = () => updateMenuPosition();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const selectBank = (b) => {
        const bin = String(b.bin || '').replace(/\D/g, '').slice(0, 6);
        onBankChange({ refundBankName: b.name, refundBankBin: bin });
        setOpen(false);
        setSearch('');
    };

    const displayLabel = bankName?.trim()
        ? bankName
        : loading
          ? 'Đang tải danh sách…'
          : 'Chọn ngân hàng (gõ để tìm)';

    const useManualBankName = loadError || (!loading && !banks.length);

    if (useManualBankName) {
        return (
            <div className="space-y-2">
                <div>
                    <label className="label py-0 text-xs">Tên ngân hàng</label>
                    <input
                        type="text"
                        className="input input-bordered input-sm w-full"
                        placeholder="Nhập tên ngân hàng (API danh sách không tải được)"
                        value={bankName}
                        onChange={(e) => onBankChange({ refundBankName: e.target.value, refundBankBin })}
                        disabled={disabled}
                    />
                </div>
                {loadError && (
                    <button type="button" className="btn btn-ghost btn-xs" onClick={onRetry} disabled={disabled || loading}>
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tải lại danh sách'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <label className="label py-0 text-xs">Ngân hàng</label>
            <button
                ref={btnRef}
                type="button"
                className="input input-bordered input-sm w-full flex items-center justify-between gap-2 text-left font-normal min-h-9"
                disabled={disabled || loading}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => {
                    if (disabled || loading) return;
                    if (!open) updateMenuPosition();
                    setOpen((o) => !o);
                }}
            >
                <span className={`truncate ${bankName?.trim() ? '' : 'text-base-content/50'}`}>{displayLabel}</span>
                {loading ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin opacity-70" />
                ) : (
                    <ChevronDown className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </button>
            <p className="text-[11px] text-base-content/55">Gõ để lọc theo tên, mã NH hoặc BIN.</p>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="listbox"
                        className="fixed z-[99999] rounded-lg border border-base-300 bg-base-100 shadow-xl flex flex-col overflow-hidden"
                        style={{
                            top: menuRect.top,
                            left: menuRect.left,
                            width: menuRect.width,
                            maxHeight: 280,
                        }}
                    >
                        <input
                            type="search"
                            autoFocus
                            className="input input-bordered input-sm rounded-none border-0 border-b border-base-300 focus:outline-none"
                            placeholder="Tìm ngân hàng…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setOpen(false);
                            }}
                        />
                        <ul className="overflow-y-auto flex-1 py-1 text-sm">
                            {filtered.length === 0 ? (
                                <li className="px-3 py-4 text-center text-base-content/60">Không có kết quả</li>
                            ) : (
                                filtered.map((b) => (
                                    <li key={`${b.code}-${b.bin}-${b.id}`}>
                                        <button
                                            type="button"
                                            role="option"
                                            className="w-full text-left px-3 py-2 hover:bg-base-200 focus:bg-base-200 focus:outline-none"
                                            onClick={() => selectBank(b)}
                                        >
                                            <span className="font-medium block truncate">
                                                {b.shortName || b.code} — {b.name}
                                            </span>
                                            <span className="text-xs text-base-content/55 font-mono">BIN {b.bin}</span>
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}
