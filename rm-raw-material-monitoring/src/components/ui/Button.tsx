import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-white hover:bg-primary/90 shadow-md active:scale-95 transition-all duration-200',
            secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-all',
            ghost: 'hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-all',
            destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md active:scale-95 transition-all',
        };

        const sizes = {
            sm: 'h-9 px-3 text-xs font-bold leading-none',
            md: 'h-11 px-5 py-2.5 text-sm font-bold leading-none',
            lg: 'h-14 px-8 text-base font-bold leading-none',
            icon: 'h-11 w-11 p-2.5 flex items-center justify-center',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 select-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
