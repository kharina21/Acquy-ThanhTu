import { useAuthTheme } from '@/stores/useAuthTheme';
import { Moon, Sun, SunMedium } from 'lucide-react';
import React from 'react';

const ThemeSwitcherButton = () => {
    const { theme, setTheme } = useAuthTheme();
    return (
        <div className='fixed top-4 right-4'>
            <label className='toggle toggle-md text-base-content/90 bg-transparent'>
                <input
                    type='checkbox'
                    value={theme}
                    onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
                <Sun className='size-4' />
                <Moon className='size-4' />
            </label>
        </div>
    );
};

export default ThemeSwitcherButton;
