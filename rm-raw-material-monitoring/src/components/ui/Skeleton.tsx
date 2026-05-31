import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton = ({ className, variant = 'rectangular' }: SkeletonProps) => {
    return (
        <div
            className={cn(
                'animate-pulse bg-gray-200 relative overflow-hidden',
                variant === 'text' && 'h-4 rounded',
                variant === 'circular' && 'rounded-full',
                variant === 'rectangular' && 'rounded-lg',
                className
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </div>
    );
};

export default Skeleton;
