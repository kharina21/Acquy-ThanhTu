import { Toaster } from 'sonner';
import { BrowserRouter } from 'react-router';
import { useAuthTheme } from './stores/useAuthTheme';
import { AppRoutes } from './routes';

function App() {
    const { theme } = useAuthTheme();
    return (
        <div className='min-h-screen w-full relative bg-base-200' data-theme={theme}>
            <div className='relative min-h-screen'>
                {/* <ThemeSwitcherButton /> */}
                <Toaster richColors />

                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </div>
        </div>
    );
}

export default App;
