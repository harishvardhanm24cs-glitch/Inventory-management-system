import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    className?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700", className)}>
            <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 border border-primary/10 shadow-sm transition-transform hover:scale-110 duration-500">
                <Icon className="w-10 h-10 text-primary opacity-60" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
            <p className="text-sm font-medium text-slate-500 max-w-sm mb-8 leading-relaxed italic">{description}</p>
            {action && (
                <Button
                    onClick={action.onClick}
                    className="h-12 px-8 rounded-2xl shadow-xl shadow-primary/10"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};
export default EmptyState;
