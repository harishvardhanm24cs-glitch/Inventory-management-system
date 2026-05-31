import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import VoiceAssistant from './VoiceAssistant';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = () => {
    console.log('DashboardLayout rendering');
    const { role } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
        return <Navigate to="/login" replace />;
    }

    // Handle responsive check
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-bg-main font-sans selection:bg-primary/20" data-role={role}>
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
                isMobile={isMobile}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-10 transition-all scroll-smooth">
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
