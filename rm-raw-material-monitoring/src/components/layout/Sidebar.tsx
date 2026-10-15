import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Search,
    Box,
    Camera,
    Bell,
    User,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    History,
    Clock,
    Layout,
    ShieldCheck,
    Cpu,
    TrendingUp,
    Map,
    X,
    Calendar,
    MapPin,
    Activity,
    Database,
    Loader2,
    QrCode,
    Clipboard,
    Brain,
    FileText,
    Percent,
    Layers,
    Warehouse
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { type UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isMobile: boolean;
}

type NavItem = {
    path: string;
    icon: any;
    label: string;
    roles?: UserRole[];
};

type NavGroup = {
    category: string;
    items: NavItem[];
};

const navGroups: NavGroup[] = [
    {
        category: 'Overview',
        items: [
            { path: '/', icon: Home, label: 'Dashboard' },
            { path: '/health', icon: Activity, label: 'System Health' },
            { path: '/tests', icon: Clipboard, label: 'Test Center' },
        ]
    },
    {
        category: 'Warehouse',
        items: [
            { path: '/inventory', icon: Box, label: 'Materials' },
            { path: '/map', icon: Map, label: 'Rack View' },
            { path: '/warehouse', icon: Layout, label: 'Digital Twin' },
            { path: '/batches', icon: Clock, label: 'Batch Records' },
            { path: '/warehouse-utilization', icon: Percent, label: 'Utilization HUD' },
            { path: '/scanner', icon: Camera, label: 'Smart Scanner' },
            { path: '/outward-scanner', icon: Camera, label: 'Outward Scanner' },
            { path: '/bulk-qr', icon: QrCode, label: 'Bulk QR Gen' },
            { path: '/qr-registry', icon: Clipboard, label: 'QR Registry' },
            { path: '/qr-history', icon: History, label: 'QR History' },
            { path: '/qr-traceability', icon: Search, label: 'QR Traceability' },
        ]
    },
    {
        category: 'AI Intelligence',
        items: [
            { path: '/inventory-intelligence', icon: Brain, label: 'Stock Health' },
            { path: '/recommendations', icon: Brain, label: 'Smart Advisor' },
            { path: '/ai-insights', icon: Brain, label: 'AI Insights' },
            { path: '/manager-dashboard', icon: Activity, label: 'Manager Stats', roles: ['admin', 'manager'] },
            { path: '/iot-console', icon: Cpu, label: 'Bridge Hub', roles: ['admin', 'store'] },
        ]
    },
    {
        category: 'Analytics & Logs',
        items: [
            { path: '/analytics', icon: TrendingUp, label: 'Intelligence', roles: ['engineer', 'manager', 'store'] },
            { path: '/consumption-analytics', icon: Activity, label: 'Consumption Hub' },
            { path: '/production-check', icon: ShieldCheck, label: 'Quality Check', roles: ['admin', 'manager', 'store'] },
            { path: '/reports', icon: FileText, label: 'Reports' },
            { path: '/alerts', icon: Bell, label: 'Notifications' },
            { path: '/transactions', icon: History, label: 'Transaction History' },
            { path: '/audit', icon: Database, label: 'Audit Log' },
        ]
    }
];

const bottomItems: NavItem[] = [
    { path: '/profile', icon: User, label: 'User Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
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

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
    const [searchTimeout, setSearchTimeout] = useState<any>(null);

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        if (searchTimeout) clearTimeout(searchTimeout);

        if (!val.trim()) {
            setSearchResults([]);
            return;
        }

        setSearchTimeout(
            setTimeout(async () => {
                setIsSearching(true);
                try {
                    const res = await api.searchMaterials(val);
                    if (res && res.materials) {
                        setSearchResults(res.materials);
                    } else if (res && res.data) {
                        setSearchResults(res.data);
                    } else if (Array.isArray(res)) {
                        setSearchResults(res);
                    } else {
                        setSearchResults([]);
                    }
                } catch (err) {
                    console.error('Search failed:', err);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300)
        );
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 relative shadow-2xs">
            {/* Sidebar Brand Header */}
            <div className={cn("flex items-center h-16 px-5 border-b border-slate-100 dark:border-slate-800", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                            <Warehouse size={18} />
                        </div>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                            RM Monitor
                        </span>
                    </div>
                )}
                {!isMobile && toggleCollapse && (
                    <button
                        onClick={toggleCollapse}
                        className={cn("p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", collapsed && "mx-auto")}
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                )}
                {isMobile && closeMobileMenu && (
                    <button onClick={closeMobileMenu} className="p-2 -mr-2 text-slate-400">
                        <ChevronLeft />
                    </button>
                )}
            </div>

            {/* Finder Search */}
            {!collapsed && (
                <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800 relative">
                     <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                               type="text"
                               placeholder="Locate material..."
                               value={searchQuery}
                               onChange={(e) => handleSearchChange(e.target.value)}
                               className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                          />
                          {(searchQuery || isSearching) && (
                               <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                    {isSearching ? (
                                         <Loader2 size={12} className="text-slate-400 animate-spin" />
                                    ) : (
                                         <button 
                                             onClick={clearSearch} 
                                             className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                                         >
                                             <X size={12} />
                                         </button>
                                    )}
                               </div>
                          )}
                     </div>
                     
                     {/* Search Results Dropdown */}
                     {searchQuery.trim() && (
                          <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto animate-saas-fade">
                               {searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                         {searchResults.map((item, idx) => (
                                              <div
                                                   key={idx}
                                                   onClick={() => {
                                                       setSelectedMaterial(item);
                                                       clearSearch();
                                                   }}
                                                   className="p-2.5 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-left flex flex-col gap-0.5"
                                              >
                                                   <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{item.material_name}</p>
                                                   <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                                                        <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200/60 font-semibold">
                                                             {item.rack_location || 'Not Assigned'}
                                                        </span>
                                                        <span>{item.quantity} KG</span>
                                                   </div>
                                              </div>
                                         ))}
                                    </div>
                               ) : (
                                    <div className="p-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                         {!isSearching ? "No materials found" : "Searching..."}
                                    </div>
                               )}
                          </div>
                     )}
                </div>
            )}

            {/* Main Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
                {navGroups.map((group) => {
                    const groupItems = group.items.filter(item => !item.roles || item.roles.includes(role));
                    if (groupItems.length === 0) return null;

                    return (
                        <div key={group.category} className="space-y-1">
                            {!collapsed && (
                                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                    {group.category}
                                </p>
                            )}
                            {groupItems.map((item) => {
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
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon size={18} className={cn("transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200")} />
                                        {!collapsed && <span className="tracking-tight">{item.label}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}

                {/* Bottom items */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            System
                        </p>
                    )}
                    {bottomItems.map((item) => {
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
                                <Icon size={18} className={cn("transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200")} />
                                {!collapsed && <span className="tracking-tight">{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Profile & Logout */}
            <div className="mt-auto border-t border-slate-100 dark:border-slate-800 p-4">
                {!collapsed ? (
                    <div className="flex items-center gap-3 px-1 mb-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                             <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">{profileName || 'User'}</p>
                             <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">{role}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center mb-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {profileName ? profileName.charAt(0).toUpperCase() : 'U'}
                        </div>
                    </div>
                )}
                
                <Link
                    to="/login"
                    onClick={isMobile ? closeMobileMenu : undefined}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
                        collapsed && "justify-center"
                    )}
                >
                    <LogOut size={16} />
                    {!collapsed && <span className="tracking-tight">Sign Out</span>}
                </Link>
            </div>

            {/* Material Finder Modal */}
            {selectedMaterial && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
                     <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
                          <div className="flex justify-between items-start">
                               <div>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                                         <MapPin size={10} />
                                         Storage Location Finder
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                                         {selectedMaterial.material_name}
                                    </h3>
                               </div>
                               <button 
                                   onClick={() => setSelectedMaterial(null)} 
                                   className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                               >
                                    <X size={16} />
                               </button>
                          </div>

                          <div className="mt-4 space-y-3">
                               <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                         <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-xs">
                                              <MapPin size={18} />
                                         </div>
                                         <div>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rack Slot</p>
                                              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                                   {selectedMaterial.rack_location || 'Not Assigned'}
                                              </p>
                                         </div>
                                    </div>
                                    <span className={cn(
                                         "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                         selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned'
                                             ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                                             : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                                    )}>
                                         {selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned' ? "LOCATED" : "PENDING"}
                                    </span>
                               </div>

                               <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</p>
                                         <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                                              {parseFloat(selectedMaterial.quantity).toLocaleString()} KG
                                         </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Number</p>
                                         <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                                              {selectedMaterial.batch_number || 'N/A'}
                                         </p>
                                    </div>
                               </div>
                          </div>

                          <div className="mt-5 flex gap-2.5">
                               <button
                                   type="button"
                                   onClick={() => setSelectedMaterial(null)}
                                   className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
                               >
                                    Close
                               </button>
                               {selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned' && (
                                    <Link
                                        to="/map"
                                        onClick={() => setSelectedMaterial(null)}
                                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-xs"
                                    >
                                         View Rack Map
                                    </Link>
                               )}
                          </div>
                     </div>
                </div>
            )}
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
                        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setIsOpen(false)}
                    />
                )}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-900",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <SidebarContent isMobile={true} closeMobileMenu={() => setIsOpen(false)} />
                </div>
            </>
        )
    }

    return (
        <div className={cn(
            "hidden md:block h-screen sticky top-0 transition-all duration-300 z-30",
            collapsed ? "w-20" : "w-64"
        )}>
            <SidebarContent collapsed={collapsed} toggleCollapse={toggleCollapse} />
        </div>
    );
};

export default Sidebar;
