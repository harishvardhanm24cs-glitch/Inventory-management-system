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
        <div className={cn("flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xs transition-colors", className)}>
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/60">
                <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">{title}</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
            {action && (
                <Button
                    onClick={action.onClick}
                    size="md"
                    className="shadow-2xs"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};
export default EmptyState;
