import { cn } from '@/components/ui/utils';

/**
 * Hàng bộ lọc admin: các ô có label phía trên, nút thao tác căn đáy (baseline) với input/select.
 * Dùng flex items-end để nút không bị lệch giữa chiều cao có/không có label.
 */
export function FilterToolbar({ className, children }) {
    return <div className={cn('flex flex-wrap items-end gap-x-4 gap-y-3', className)}>{children}</div>;
}

export function FilterToolbarField({ label, children, className }) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <span className="text-xs font-medium text-base-content/70">{label}</span>
            {children}
        </div>
    );
}

/** Nhóm nút bên phải hàng lọc — vẫn nằm trong FilterToolbar để items-end áp dụng đồng nhất */
export function FilterToolbarActions({ className, children }) {
    return <div className={cn('flex flex-wrap items-end gap-2', className)}>{children}</div>;
}
