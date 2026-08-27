import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-800/60 p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
