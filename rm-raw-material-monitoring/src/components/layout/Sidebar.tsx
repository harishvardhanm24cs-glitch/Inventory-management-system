import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Search,
    Box,
    Maximize,
    Camera,
    Bell,
    User,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    History,
    Tag,
    Clock,
    Layout,
    ShieldCheck,
    Cpu,
    ArrowRightLeft,
    PackageMinus,
    PackagePlus,
    TrendingUp,
    Map
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { type UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isMobile: boolean;
}

type NavItem = {
    path: string;
    icon: any;
    label: string;
    roles?: UserRole[]; // Optional: if not specified, available to all roles
};

const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Overview' },
    { path: '/inventory', icon: Box, label: 'Materials' },
    { path: '/batches', icon: Clock, label: 'Batch Records' },
    { path: '/warehouse', icon: Layout, label: 'Digital Twin' },
    { path: '/map', icon: Map, label: 'Rack View' },
    { path: '/production-check', icon: ShieldCheck, label: 'Quality Check', roles: ['admin', 'manager', 'store'] },
    { path: '/iot-console', icon: Cpu, label: 'Bridge Hub', roles: ['admin', 'store'] },
    { path: '/scanner', icon: Camera, label: 'Smart Scanner' },
    { path: '/barcode-registry', icon: Tag, label: 'SKU Registry', roles: ['admin', 'manager', 'store'] },
    { path: '/analytics', icon: TrendingUp, label: 'Intelligence', roles: ['engineer', 'manager', 'store'] },
    { path: '/alerts', icon: Bell, label: 'Notifications' },
    { path: '/transactions', icon: History, label: 'Ledger' },
];
const bottomItems: NavItem[] = [
    { path: '/profile', icon: User, label: 'User Profile' },
    { path: '/settings', icon: Settings, label: 'Account Settings' },
    { path: '/guide', icon: HelpCircle, label: 'User Guide' },
];

interface SidebarContentProps {
    collapsed?: boolean;
    toggleCollapse?: () => void;
    isMobile?: boolean;
    closeMobileMenu?: () => void;
}

const SidebarContent = ({ collapsed = false, toggleCollapse, isMobile = false, closeMobileMenu }: SidebarContentProps) => {
    const location = useLocation();
    const { role, profileName } = useAuth();

    const visibleNavItems = navItems.filter(item => !item.roles || item.roles.includes(role));
    const visibleBottomItems = bottomItems.filter(item => !item.roles || item.roles.includes(role));

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 relative shadow-sm">
            {/* Header */}
            <div className={cn("flex items-center h-20 px-6 border-b border-slate-50", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && (
                    <span className="text-xl font-extrabold text-[#4F8CFF] tracking-tight">
                        RM Monitor
                    </span>
                )}
                {!isMobile && toggleCollapse && (
                    <button
                        onClick={toggleCollapse}
                        className={cn("p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors", collapsed && "mx-auto")}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                )}
                {isMobile && closeMobileMenu && (
                    <button onClick={closeMobileMenu} className="p-2 -mr-2 text-slate-400">
                        <ChevronLeft />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={isMobile ? closeMobileMenu : undefined}
                            className={cn(
                                "saas-sidebar-item group",
                                isActive ? "saas-sidebar-item-active" : "saas-sidebar-item-inactive",
                                collapsed && "justify-center px-0"
                            )}
                        >
                            <Icon size={20} className={cn("transition-all duration-200", isActive ? "text-[#4F8CFF]" : "text-slate-400 group-hover:text-slate-600")} />
                            {!collapsed && <span className="tracking-tight">{item.label}</span>}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <div className="mt-auto border-t border-slate-50 p-6">
                {!collapsed ? (
                    <div className="flex items-center gap-3 px-2 mb-6">
                        <div className="h-10 w-10 rounded-full bg-[#F0F7FF] flex items-center justify-center border border-[#4F8CFF]/10 text-[#4F8CFF]">
                            <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{profileName || 'User'}</p>
                             <p className="text-[11px] font-medium text-slate-400 capitalize">{role}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center mb-6">
                        <div className="h-10 w-10 rounded-full bg-[#F0F7FF] flex items-center justify-center border border-[#4F8CFF]/10 text-[#4F8CFF]">
                            <User size={20} />
                        </div>
                    </div>
                )}
                
                <Link
                    to="/login"
                    onClick={isMobile ? closeMobileMenu : undefined}
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-400 hover:bg-red-50 hover:text-red-600",
                        collapsed && "justify-center"
                    )}
                >
                    <LogOut size={20} />
                    {!collapsed && <span className="tracking-tight">Logout</span>}
                </Link>
            </div>
        </div>
    );
};

const Sidebar = ({ isOpen, setIsOpen, isMobile }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    if (isMobile) {
        return (
            <>
                {isOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                )}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out glass-panel",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <SidebarContent isMobile={true} closeMobileMenu={() => setIsOpen(false)} />
                </div>
            </>
        )
    }

    // Desktop Sidebar
    return (
        <div className={cn(
            "hidden md:block h-screen sticky top-0 transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            <SidebarContent collapsed={collapsed} toggleCollapse={toggleCollapse} />
        </div>
    );
};

export default Sidebar;
