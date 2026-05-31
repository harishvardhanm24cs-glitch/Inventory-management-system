import React from 'react';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
    className?: string;
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className, message = "Synchronizing node data..." }) => {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 gap-6 animate-in fade-in duration-700", className)}>
            <div className="relative">
                <div className="w-16 h-16 rounded-3xl border-4 border-primary/10 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">System Loading</span>
                <span className="text-xs font-bold text-slate-400 mt-1 italic">{message}</span>
            </div>
        </div>
    );
};

export default LoadingSpinner;
