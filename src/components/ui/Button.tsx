import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-200 border border-slate-600',
};

export function Button({ variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
