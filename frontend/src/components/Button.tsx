import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warm';
type Size = 'sm' | 'md' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children?: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-heading font-semibold text-sm border cursor-pointer whitespace-nowrap [transition:transform_0.12s_ease,box-shadow_0.15s_ease,background-color_0.15s_ease,border-color_0.15s_ease] active:translate-y-px active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:transform-none';

const SIZE: Record<Size, string> = {
  md: 'px-5 py-3 rounded-md',
  sm: 'px-3.5 py-2 text-13 rounded-md',
  icon: 'p-2.5 rounded-full',
};

const VARIANT: Record<Variant, string> = {
  primary: 'border-transparent bg-gradient-cta text-ink-inverse shadow-btn-primary hover:brightness-105 hover:shadow-lg',
  secondary: 'border-line bg-surface-raised text-ink shadow-sm hover:border-line-strong hover:bg-bg-alt',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-accent-tint hover:text-accent-dark',
  warm: 'border-transparent bg-gradient-warm text-accent-2-ink shadow-glow-warm hover:brightness-105',
};

export function Button({ variant = 'primary', size = 'md', block, className, children, ...rest }: ButtonProps) {
  const classes = [BASE, SIZE[size], VARIANT[variant], block ? 'w-full' : '', className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
