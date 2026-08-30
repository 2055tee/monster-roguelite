import Link from 'next/link';
import type { ReactNode } from 'react';

export function HubNavButton({
  href,
  emoji,
  label,
  subtitle,
  accentClass,
  disabled,
  disabledReason,
}: {
  href: string;
  emoji: string;
  label: string;
  subtitle?: ReactNode;
  accentClass: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const content = (
    <div
      className={`flex h-full flex-col items-center gap-1 rounded-lg border p-4 text-center transition-colors ${accentClass} ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110'
      }`}
      title={disabled ? disabledReason : undefined}
    >
      <span className="text-3xl leading-none">{emoji}</span>
      <span className="text-sm font-bold">{label}</span>
      {subtitle ? <span className="text-xs opacity-80">{subtitle}</span> : null}
    </div>
  );

  if (disabled) return content;

  return (
    <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
      {content}
    </Link>
  );
}
