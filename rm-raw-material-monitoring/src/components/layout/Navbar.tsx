import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScanLine, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const Navbar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/scan', icon: ScanLine, label: 'Scan RM' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <nav className="bg-slate-900 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <span className="text-xl font-bold text-blue-400">RM Monitor</span>
                    </div>
                    <div className="flex space-x-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-slate-800 text-blue-400"
                                            : "text-gray-300 hover:bg-slate-800 hover:text-white"
                                    )}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
