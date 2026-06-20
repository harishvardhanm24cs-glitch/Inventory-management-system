import { Menu, User, Bell, Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import NotificationPanel from './NotificationPanel';
import { useInventory } from '../../context/InventoryContext';
import { cn } from '../../lib/utils';
import MaterialSearchModal from '../ui/MaterialSearchModal';

interface TopbarProps {
    onMenuClick: () => void;
}

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ onMenuClick }: TopbarProps) => {
    const { theme } = useTheme();
    const { profileName, role } = useAuth(); // 'role' is already correctly destructured from useAuth
    const { alerts } = useInventory();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const roleLabels: Record<string, string> = {
        store: 'Store Worker',
        engineer: 'Production Engineer',
        manager: 'Production Manager'
    };

    return (
        <header className="glass-navbar flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <Menu size={20} />
                </button>
                
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-slate-400 font-medium tracking-tight">Enterprise</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-bold capitalize tracking-tight">
                        {(() => {
                            const path = window.location.pathname.split('/').pop() || 'Dashboard';
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
                <div 
                    onClick={() => setIsSearchOpen(true)}
                    className="hidden lg:flex items-center bg-white/40 px-4 py-2 rounded-2xl border border-white/40 hover:border-slate-300 transition-all backdrop-blur-md shadow-inner cursor-pointer"
                >
                    <div className="text-slate-400 group-hover:text-primary transition-colors"><SearchIcon size={16} /></div>
                    <input 
                        type="text" 
                        readOnly
                        placeholder="Neural search materials..." 
                        className="bg-transparent border-none outline-none text-[12px] ml-3 w-48 font-bold text-slate-700 placeholder:text-slate-450 cursor-pointer"
                    />
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={cn(
                            "relative p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all group",
                            isNotificationsOpen && "bg-slate-100 text-primary"
                        )}
                    >
                        <Bell size={18} className={cn("group-hover:rotate-12 transition-transform", alerts.length > 0 && "animate-pulse")} />
                        {alerts.length > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                        )}
                    </button>

                    <NotificationPanel 
                        isOpen={isNotificationsOpen} 
                        onClose={() => setIsNotificationsOpen(false)} 
                    />
                </div>
                <div className="h-8 w-[1px] bg-slate-100 mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-extrabold text-slate-900 leading-none tracking-tight">{profileName || 'Loading...'}</p>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1 opacity-80">{roleLabels[role] || 'Member'}</p>
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
