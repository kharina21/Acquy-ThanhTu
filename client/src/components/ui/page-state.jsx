import * as React from 'react';

import { cn } from './utils';

const shell = 'rounded-2xl border max-w-lg mx-auto text-center';

const variants = {
    loading: 'border-base-200/80 bg-base-100 p-10 sm:p-12',
    neutral: 'border-base-200/70 bg-base-200/40 p-10 sm:p-12',
    empty: 'border-base-200/80 bg-base-100 p-10 sm:p-14',
    warning: 'border-warning/35 bg-warning/8 p-10 sm:p-12',
    success: 'border-success/30 bg-gradient-to-b from-success/12 via-base-100 to-base-100 p-8 sm:p-10',
};

const iconShell = {
    default: 'bg-primary/10 text-primary border border-primary/15',
    warning: 'bg-warning/15 text-warning border border-warning/25',
    success: 'bg-success/20 text-success border border-success/20',
};

/**
 * Trạng thái trang: đang tải, trống, cảnh báo, thành công — cùng một ngôn ngữ thị giác.
 */
export function PageState({ variant = 'neutral', icon: Icon, title, description, children, className }) {
    const v = variants[variant] ?? variants.neutral;
    const tone =
        variant === 'warning' ? iconShell.warning : variant === 'success' ? iconShell.success : iconShell.default;

    if (variant === 'loading') {
        return (
            <div className={cn(shell, v, className)}>
                <div className='flex flex-col items-center gap-4'>
                    <span className='loading loading-spinner loading-lg text-primary' />
                    {title ? <p className='text-base-content/70 text-sm font-medium'>{title}</p> : null}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(shell, v, className)}>
            {Icon ? (
                <div
                    className={cn(
                        'w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center',
                        tone
                    )}
                >
                    <Icon className='w-7 h-7 sm:w-8 sm:h-8' strokeWidth={1.75} />
                </div>
            ) : null}
            {title ? <p className='text-base-content font-semibold text-base sm:text-lg mb-2'>{title}</p> : null}
            {description ? (
                <p className='text-base-content/65 text-sm leading-relaxed mb-6 max-w-md mx-auto'>{description}</p>
            ) : null}
            {children}
        </div>
    );
}
