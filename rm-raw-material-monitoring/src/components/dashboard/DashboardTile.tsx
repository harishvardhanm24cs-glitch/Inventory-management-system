import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardTileProps {
    icon: LucideIcon;
    label: string;
    to: string;
    description?: string;
    color?: string; // Optional color hex or class
}

const DashboardTile = ({ icon: Icon, label, to, color = '#4F8CFF' }: DashboardTileProps) => {
    return (
        <Link 
            to={to} 
            className="block group"
        >
            <div className="saas-card h-40 flex flex-col items-center justify-center gap-4 p-6">
                {/* Icon Circle */}
                <div 
                    className="icon-container bg-slate-50 group-hover:bg-primary transition-all duration-300"
                    style={{ '--primary-glow': `${color}20` } as React.CSSProperties}
                >
                    <Icon 
                        size={24} 
                        className="text-slate-400 group-hover:text-white transition-colors duration-300" 
                    />
                </div>
                
                <span className="text-[13px] font-bold text-slate-700 group-hover:text-primary transition-colors text-center tracking-tight">
                    {label}
                </span>
            </div>
        </Link>
    );
};

export default DashboardTile;
