import { Menu, Bell, Search as SearchIcon, Sun, Moon, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { useInventory } from '../../context/InventoryContext';
import { cn } from '../../lib/utils';
import MaterialSearchModal from '../ui/MaterialSearchModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
    onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
    const { theme, setTheme } = useTheme();
    const { profileName, role } = useAuth(); 
    const { alerts } = useInventory();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const navigate = useNavigate();

    const roleLabels: Record<string, string> = {
        store: 'Store Worker',
        engineer: 'Production Engineer',
        manager: 'Production Manager',
        admin: 'System Administrator'
    };

    const toggleThemeMode = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 h-16 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md transition-colors">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <Menu size={20} />
                </button>
                
                <div className="hidden md:flex items-center gap-2 text-xs">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Enterprise</span>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold capitalize tracking-tight">
                        {(() => {
                            const path = window.location.pathname.split('/').filter(Boolean).pop() || 'Dashboard';
                            if (path === 'iot-console') return 'Bridge Hub';
                            if (path === 'smart-scanner') return 'AI Insights';
                            if (path === 'scanner') return 'Smart Scanner';
                            if (path === 'production-check') return 'Quality Check';
                            if (path === 'remove-rm') return 'Remove RM';
                            return path.replace(/-/g, ' ');
                        })()}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Search Trigger */}
                <div 
                    onClick={() => setIsSearchOpen(true)}
                    className="hidden lg:flex items-center bg-slate-100/80 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
                >
                    <SearchIcon size={14} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-xs ml-2.5 w-44 font-medium text-slate-500 dark:text-slate-400">
                        Search materials...
                    </span>
                    <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">⌘K</kbd>
                </div>

                {/* Quick Scanner Shortcut */}
                <button
                    onClick={() => navigate('/scanner')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all"
                    title="Quick Scan QR Code"
                >
                    <QrCode size={14} />
                    <span>Quick Scan</span>
                </button>

                {/* Theme Toggle Button */}
                <button
                    onClick={toggleThemeMode}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title={theme === 'dark' ? 'Switch to Light Industrial Theme' : 'Switch to Dark Theme'}
                >
                    {theme === 'dark' ? (
                        <Sun size={18} className="text-amber-400" />
                    ) : (
                        <Moon size={18} className="text-slate-600" />
                    )}
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={cn(
                            "relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group",
                            isNotificationsOpen && "bg-slate-100 dark:bg-slate-800 text-blue-600"
                        )}
                    >
                        <Bell size={18} className={cn("group-hover:rotate-12 transition-transform", alerts.length > 0 && "animate-pulse")} />
                        {alerts.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        )}
                    </button>

                    <NotificationPanel 
                        isOpen={isNotificationsOpen} 
                        onClose={() => setIsNotificationsOpen(false)} 
                    />
                </div>

                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* User Profile Info */}
                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">{profileName || 'User'}</p>
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">{roleLabels[role] || 'Member'}</p>
                    </div>
                </div>
            </div>

            <MaterialSearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
            />
        </header>
    );
};

export default Topbar;
