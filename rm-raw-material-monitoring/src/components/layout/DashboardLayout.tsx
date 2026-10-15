import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import VoiceAssistant from './VoiceAssistant';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
    const { role } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        return <Navigate to="/login" replace />;
    }

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-900 text-[#0F172A] dark:text-slate-100 font-sans antialiased transition-colors" data-role={role}>
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isMobile={isMobile}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 transition-all scroll-smooth">
                    <div className="max-w-[1700px] mx-auto animate-saas-fade">
                        <Outlet />
                    </div>
                </main>
            </div>
            <VoiceAssistant />
        </div>
    );
};

export default DashboardLayout;
