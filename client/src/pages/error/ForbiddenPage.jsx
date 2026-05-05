import React from 'react';
import { getClientAppHomeUrl } from '@/lib/utils';

const ForbiddenPage = () => {
    const homeUrl = getClientAppHomeUrl();
    return (
        <div className='flex flex-col items-center justify-center min-h-screen text-center bg-base-200' role="main">
            <img
                src='/403-forbidden.png'
                alt='Không có quyền truy cập'
                className='max-w-full mb-6 w-96'
                loading="lazy"
                decoding="async"
            />
            <h1 className='text-2xl font-bold mb-2'>Không có quyền truy cập</h1>
            <p className='text-xl font-semibold mb-6'>Cấm! Bạn không có quyền truy cập trang này!</p>
            <a
                href={homeUrl}
                className='inline-block px-6 py-3 font-medium text-white transition shadow-md bg-primary rounded-2xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                aria-label="Quay về trang chủ"
            >
                Quay về trang chủ
            </a>
        </div>
    );
};

export default ForbiddenPage;
