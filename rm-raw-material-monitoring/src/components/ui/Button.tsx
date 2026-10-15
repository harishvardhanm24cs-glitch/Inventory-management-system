import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs active:scale-98 transition-all duration-150',
            secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-98 transition-all',
            outline: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs active:scale-98 transition-all',
            ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all',
            destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs active:scale-98 transition-all',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs font-semibold rounded-lg',
            md: 'h-10 px-4 text-xs font-semibold rounded-xl',
            lg: 'h-12 px-6 text-sm font-semibold rounded-xl',
            icon: 'h-10 w-10 p-2 flex items-center justify-center rounded-xl',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 select-none gap-2',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
