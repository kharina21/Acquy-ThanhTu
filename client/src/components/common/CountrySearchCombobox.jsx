import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { getCountryOptions } from '@/data/countryOptionsVi';

function stripAccents(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Chọn xuất xứ (quốc gia) — mở ra: gõ trên cùng dòng; panel bên dưới dùng chung theme, không tách ô tìm tối/ sáng lạ.
 */
export default function CountrySearchCombobox({ value, onChange, disabled = false, id: idProp }) {
    const id = idProp || 'product-origin-country';
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);
    const [menuRect, setMenuRect] = useState({ top: 0, left: 0, width: 0 });

    const options = useMemo(() => getCountryOptions(), []);
    const filtered = useMemo(() => {
        const q = stripAccents(search.trim());
        if (!options.length) return [];
        if (!q) return options.slice(0, 150);
        return options
            .filter((o) => {
                const name = stripAccents(o.name);
                return name.includes(q) || String(o.code).toLowerCase().includes(q);
            })
            .slice(0, 200);
    }, [options, search]);

    const updateMenuPosition = () => {
        const el = rootRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const w = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
        let left = r.left;
        if (left + w > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - w - 8);
        }
        setMenuRect({ top: r.bottom, left, width: w });
    };

    useLayoutEffect(() => {
        if (!open) {
            return;
        }
        const run = () => {
            updateMenuPosition();
            requestAnimationFrame(updateMenuPosition);
        };
        run();
    }, [open]);

    useEffect(() => {
        if (!open) {
            setSearch('');
            setMenuRect({ top: 0, left: 0, width: 0 });
        } else {
            setSearch('');
        }
    }, [open]);

    useLayoutEffect(() => {
        if (open && !disabled) {
            inputRef.current?.focus();
        }
    }, [open, disabled]);

    useEffect(() => {
        if (!open) return;
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
            if (rootRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const select = (name) => {
        onChange(name);
        setOpen(false);
        setSearch('');
    };

    const displayLabel = value?.trim() ? value : 'Chọn quốc gia (gõ để tìm)';

    const showList = open && !disabled && menuRect.width > 0;

    return (
        <div className="space-y-1.5">
            <label className="label py-0" htmlFor={open ? `${id}-search` : id}>
                <span className="label-text text-xs font-medium">Xuất xứ</span>
            </label>

            <div ref={rootRef} className="w-full">
                {open && !disabled ? (
                    <div className="flex w-full min-h-9 items-stretch overflow-hidden rounded-t-lg border border-b-0 border-base-300 bg-base-100 shadow-sm ring-1 ring-base-300/80 transition-shadow focus-within:ring-2 focus-within:ring-primary/25">
                        <input
                            id={`${id}-search`}
                            ref={inputRef}
                            type="text"
                            name="origin-country-search"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="input input-ghost input-sm h-9 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-0"
                            placeholder="Gõ tên nước, ví dụ: Việt, Đức, Mỹ…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setOpen(false);
                                    setSearch('');
                                }
                            }}
                            aria-controls={`${id}-listbox`}
                            aria-expanded
                            role="combobox"
                        />
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-l border-base-300/90 bg-base-200/40 text-base-content/70 transition-colors hover:bg-base-200"
                            onClick={() => {
                                setOpen(false);
                                setSearch('');
                            }}
                            tabIndex={-1}
                            aria-label="Đóng danh sách"
                        >
                            <ChevronDown className="h-4 w-4 rotate-180" />
                        </button>
                    </div>
                ) : (
                    <button
                        id={id}
                        type="button"
                        className="input input-bordered input-sm flex min-h-9 w-full items-center justify-between gap-2 text-left font-normal text-base-content shadow-sm transition-all hover:border-base-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        disabled={disabled}
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        onClick={() => {
                            if (disabled) return;
                            setOpen(true);
                        }}
                    >
                        <span
                            className={`min-w-0 flex-1 truncate ${
                                value?.trim() ? 'text-base-content' : 'text-base-content/45'
                            }`}
                        >
                            {displayLabel}
                        </span>
                        <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform ${
                                open ? 'rotate-180 opacity-90' : 'rotate-0 opacity-60'
                            }`}
                        />
                    </button>
                )}
            </div>

            {value?.trim() && !open && (
                <button
                    type="button"
                    className="btn btn-ghost btn-xs h-auto min-h-0 px-1 py-0 text-base-content/55 hover:text-base-content"
                    onClick={() => onChange('')}
                >
                    Xóa lựa chọn
                </button>
            )}

            {showList &&
                createPortal(
                    <div
                        id={`${id}-listbox`}
                        ref={panelRef}
                        role="listbox"
                        className="fixed z-[99999] max-h-[min(16rem,45vh)] overflow-y-auto overflow-x-hidden rounded-b-lg border border-t-0 border-base-300 bg-base-100 py-1.5 text-base-content shadow-md ring-1 ring-base-300/50 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-base-300/80"
                        style={{
                            top: menuRect.top,
                            left: menuRect.left,
                            width: menuRect.width,
                        }}
                    >
                        {filtered.length === 0 ? (
                            <div className="px-3.5 py-4 text-center text-sm text-base-content/55">Không có kết quả</div>
                        ) : (
                            <ul>
                                {filtered.map((o) => (
                                    <li key={o.code} className="px-1.5">
                                        <button
                                            type="button"
                                            role="option"
                                            className="w-full cursor-pointer rounded-md px-2.5 py-2.5 text-left text-sm text-base-content transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none active:bg-primary/15"
                                            onClick={() => select(o.name)}
                                        >
                                            {o.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
