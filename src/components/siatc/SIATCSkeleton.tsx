import { cn } from '../../utils/cn';

interface SIATCSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
}

const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-muted rounded-lg", className)} />
);

export const SIATCTableSkeleton = ({ rows = 8, columns = 6 }: SIATCSkeletonProps) => {
  return (
    <div className="w-full px-6 py-4 space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4 pb-3 border-b border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonPulse key={`h-${i}`} className="h-4 flex-1 max-w-[120px]" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 py-3 border-b border-border/30"
          style={{ animationDelay: `${rowIdx * 75}ms` }}
        >
          {/* Type badge skeleton */}
          <SkeletonPulse className="h-6 w-12 rounded-full" />
          {/* Doc number */}
          <SkeletonPulse className="h-4 w-20" />
          {/* Ticket */}
          <SkeletonPulse className="h-4 w-16" />
          {/* Store */}
          <SkeletonPulse className="h-4 w-28" />
          {/* Client */}
          <SkeletonPulse className="h-4 w-32" />
          {/* Date */}
          <SkeletonPulse className="h-4 w-20" />
          {/* Status badge */}
          <SkeletonPulse className="h-6 w-20 rounded-full ml-auto" />
        </div>
      ))}
    </div>
  );
};

export const SIATCCardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-2xl border border-border/50 bg-card p-5 space-y-3", className)}>
    <div className="flex items-center justify-between">
      <SkeletonPulse className="h-4 w-24" />
      <SkeletonPulse className="h-8 w-8 rounded-full" />
    </div>
    <SkeletonPulse className="h-8 w-16" />
    <SkeletonPulse className="h-3 w-20" />
  </div>
);
