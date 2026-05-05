import * as React from 'react';

import { cn } from './utils';

/**
 * Khối nền thống nhất cho trang khách (giỏ, thanh toán, đơn, sản phẩm).
 * Dùng token base-* để đồng bộ với theme DaisyUI.
 */
export function SurfaceCard({ className, ...props }) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-base-200/90 bg-base-100 text-base-content shadow-sm',
                className
            )}
            {...props}
        />
    );
}
