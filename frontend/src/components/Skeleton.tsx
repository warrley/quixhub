import { Card } from './Card';

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-sunken ${className ?? ''}`} />;
}

// Placeholder shaped like DisciplineCard, for grids that fetch on mount.
export function CardSkeleton() {
  return (
    <Card padding="none">
      <div className="flex flex-col gap-2.5 py-4 pr-4 pl-[18px]">
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex justify-between items-center mt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </Card>
  );
}

// Placeholder shaped like an /opinioes professor row, for grids fetching stats.
export function RowSkeleton() {
  return (
    <div className="border border-line rounded-md py-2.5 px-3 flex items-center justify-between gap-2.5">
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-8" />
    </div>
  );
}
