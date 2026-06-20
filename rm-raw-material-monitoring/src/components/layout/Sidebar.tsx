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
    FileText
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
    roles?: UserRole[]; // Optional: if not specified, available to all roles
};

const navItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Overview' },
    { path: '/health', icon: Activity, label: 'System Health' },
    { path: '/tests', icon: Clipboard, label: 'Test Center' },
    { path: '/inventory', icon: Box, label: 'Materials' },
    { path: '/batches', icon: Clock, label: 'Batch Records' },
    { path: '/warehouse', icon: Layout, label: 'Digital Twin' },
    { path: '/map', icon: Map, label: 'Rack View' },
    { path: '/production-check', icon: ShieldCheck, label: 'Quality Check', roles: ['admin', 'manager', 'store'] },
    { path: '/iot-console', icon: Cpu, label: 'Bridge Hub', roles: ['admin', 'store'] },
    { path: '/scanner', icon: Camera, label: 'Smart Scanner' },
    { path: '/outward-scanner', icon: PackageMinus, label: 'Outward Scanner' },
    { path: '/bulk-qr', icon: QrCode, label: 'Bulk QR Gen' },
    { path: '/qr-registry', icon: Clipboard, label: 'QR Registry' },
    { path: '/qr-history', icon: History, label: 'QR History' },
    { path: '/qr-traceability', icon: Search, label: 'QR Traceability' },
    { path: '/analytics', icon: TrendingUp, label: 'Intelligence', roles: ['engineer', 'manager', 'store'] },
    { path: '/ai-insights', icon: Brain, label: 'AI Insights' },
    { path: '/manager-dashboard', icon: Activity, label: 'Manager Stats', roles: ['admin', 'manager'] },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/alerts', icon: Bell, label: 'Notifications' },
    { path: '/transactions', icon: History, label: 'Transaction History' },
    { path: '/audit', icon: Database, label: 'Audit Log' },
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

    // Material Location Finder Search State
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
                        className={cn("saas-sidebar-collapse-btn", collapsed && "mx-auto")}
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

            {/* Search Finder Box */}
            {!collapsed && (
                <div className="px-4 py-3 border-b border-slate-50 relative">
                     <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                               type="text"
                               placeholder="Find material location..."
                               value={searchQuery}
                               onChange={(e) => handleSearchChange(e.target.value)}
                               className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-[#4F8CFF]/25 focus:border-[#4F8CFF] transition-all text-slate-900"
                          />
                          {(searchQuery || isSearching) && (
                               <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
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
                     
                     {/* Floating Search Results Dropdown */}
                     {searchQuery.trim() && (
                          <div className="absolute left-4 right-4 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto animate-saas-fade">
                               {searchResults.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                         {searchResults.map((item, idx) => (
                                              <div
                                                   key={idx}
                                                   onClick={() => {
                                                       setSelectedMaterial(item);
                                                       clearSearch();
                                                   }}
                                                   className="p-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer text-left flex flex-col gap-0.5"
                                              >
                                                   <p className="text-xs font-bold text-slate-800 truncate">{item.material_name}</p>
                                                   <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                                             {item.rack_location || 'Not Assigned'}
                                                        </span>
                                                        <span>{item.quantity} KG</span>
                                                   </div>
                                              </div>
                                         ))}
                                    </div>
                               ) : (
                                    <div className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                         {!isSearching ? "No materials found" : "Searching..."}
                                    </div>
                               )}
                          </div>
                     )}
                </div>
            )}

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

            {/* Material Location details Modal */}
            {selectedMaterial && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                     <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-slate-900">
                          <div className="flex justify-between items-start">
                               <div>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                         <MapPin size={10} />
                                         Material Location Finder
                                    </span>
                                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-3">
                                         {selectedMaterial.material_name}
                                    </h3>
                               </div>
                               <button 
                                   onClick={() => setSelectedMaterial(null)} 
                                   className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                               >
                                    <X size={18} />
                               </button>
                          </div>

                          <div className="mt-6 space-y-4">
                               {/* Rack Location Highlight Panel */}
                               <div className="bg-slate-50 border border-slate-150/50 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                         <div className="p-3 bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/10">
                                              <MapPin size={20} />
                                         </div>
                                         <div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Storage Slot</p>
                                              <p className="text-base font-black text-slate-800 mt-0.5">
                                                   {selectedMaterial.rack_location || 'Not Assigned'}
                                              </p>
                                         </div>
                                    </div>
                                    <span className={cn(
                                         "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                         selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned'
                                             ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                             : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                                    )}>
                                         {selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned' ? "LOCATED" : "PENDING STORAGE"}
                                    </span>
                               </div>

                               <div className="grid grid-cols-2 gap-4">
                                    {/* Current Stock */}
                                    <div className="bg-slate-50 border border-slate-150/30 p-4 rounded-2xl">
                                         <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                              <Database size={14} />
                                              <span className="text-[9px] font-black uppercase tracking-widest">Current Stock</span>
                                         </div>
                                         <p className="text-lg font-black text-slate-800">
                                              {parseFloat(selectedMaterial.quantity).toLocaleString()} KG
                                         </p>
                                    </div>

                                    {/* Batch Number */}
                                    <div className="bg-slate-50 border border-slate-150/30 p-4 rounded-2xl">
                                         <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                              <Clock size={14} />
                                              <span className="text-[9px] font-black uppercase tracking-widest">Batch Number</span>
                                         </div>
                                         <p className="text-sm font-black text-slate-800 truncate">
                                              {selectedMaterial.batch_number || 'N/A'}
                                         </p>
                                    </div>
                               </div>

                               {/* Manufacturing Date */}
                               <div className="bg-slate-50 border border-slate-150/30 p-4 rounded-2xl">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                         <Calendar size={14} />
                                         <span className="text-[9px] font-black uppercase tracking-widest">Registered Date</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">
                                         {selectedMaterial.manufacturing_date 
                                             ? new Date(selectedMaterial.manufacturing_date).toLocaleString('en-US', {
                                                   dateStyle: 'medium',
                                                   timeStyle: 'short'
                                               })
                                             : 'N/A'
                                         }
                                    </p>
                               </div>

                               {/* Barcode Identity Info */}
                               <div className="bg-slate-50 border border-slate-150/30 p-4 rounded-2xl flex items-center justify-between">
                                    <div>
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Barcode SKU</p>
                                         <code className="text-xs font-mono font-bold text-slate-700 mt-1 block">
                                              {selectedMaterial.barcode}
                                         </code>
                                    </div>
                               </div>
                          </div>

                          <div className="mt-6 flex gap-3">
                               <button
                                   type="button"
                                   onClick={() => setSelectedMaterial(null)}
                                   className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"
                               >
                                    Close Finder
                               </button>
                               {selectedMaterial.rack_location && selectedMaterial.rack_location !== 'Not Assigned' && (
                                    <Link
                                        to="/map"
                                        onClick={() => setSelectedMaterial(null)}
                                        className="flex-1 py-3.5 bg-primary hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 text-center flex items-center justify-center gap-2 transition-all active:scale-95"
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
