import { useState } from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route } from 'react-router';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PublicRoute from './components/auth/PublicRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RegisterPage from './pages/RegisterPage';
import { useAuthTheme } from './stores/useAuthTheme';
import ThemeSwitcherButton from './components/ThemeSwitcherButton';

function App() {
    const { theme } = useAuthTheme();
    return (
        <div className='h-screen w-full relative' data-theme={theme}>
            <div className='relative'>
                <ThemeSwitcherButton />
                <Toaster richColors />

                <BrowserRouter>
                    <Routes>
                        <Route element={<PublicRoute />}>
                            <Route path='/login' element={<LoginPage />} />
                            <Route path='/register' element={<RegisterPage />} />
                        </Route>

                        <Route element={<ProtectedRoute />}>
                            <Route index path='/' element={<HomePage />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </div>
        </div>
    );
}

export default App;
