import type { HTMLAttributes, ReactNode } from 'react';

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
};

export function Panel({ title, className = '', children, ...props }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-900 ${className}`}
      {...props}
    >
      {title ? (
        <div className="border-b border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">
          {title}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
