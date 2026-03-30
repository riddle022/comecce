import React from 'react';

interface SkeletonProps {
  rows?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ rows = 12 }) => (
  <div className="space-y-2 animate-pulse p-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-8 bg-slate-800/60 rounded" style={{ opacity: 1 - i * 0.06 }} />
    ))}
  </div>
);
