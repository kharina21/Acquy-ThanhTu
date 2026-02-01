import React from 'react';

/**
 * SkeletonLoader - Loading placeholder component
 */
export const SkeletonLoader = ({ className = '', count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`animate-pulse bg-base-300 rounded ${className}`}
                    aria-label="Đang tải..."
                    role="status"
                >
                    <span className="sr-only">Đang tải...</span>
                </div>
            ))}
        </>
    );
};

/**
 * TableSkeleton - Skeleton loader for table rows
 */
export const TableSkeleton = ({ rows = 5, cols = 7 }) => {
    return (
        <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, index) => (
                            <th key={index}>
                                <SkeletonLoader className="h-4 w-24" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: cols }).map((_, colIndex) => (
                                <td key={colIndex}>
                                    <SkeletonLoader className="h-4 w-full" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SkeletonLoader;

