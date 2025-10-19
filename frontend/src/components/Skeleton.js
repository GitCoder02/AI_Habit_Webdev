// components/Skeleton.js
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded ${className}`} />;
}

export function SkeletonRow() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-2/5" />
    </div>
  );
}