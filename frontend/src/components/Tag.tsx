import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type Tone = 'accent' | 'accent2' | 'accent3' | 'good' | 'warn' | 'danger' | 'neutral' | 'outline' | 'selected';

const BASE = 'inline-flex items-center gap-5px font-heading font-semibold text-11-5 px-3 py-1.5 rounded-full whitespace-nowrap border';

const TONE: Record<Tone, string> = {
  accent: 'border-transparent bg-accent-tint text-accent-dark',
  accent2: 'border-transparent bg-accent-2-tint text-accent-2-ink',
  accent3: 'border-transparent bg-accent-3-tint text-accent-3-dark',
  good: 'border-transparent bg-good-tint text-good',
  warn: 'border-transparent bg-warn-tint text-warn',
  danger: 'border-transparent bg-danger-tint text-danger',
  neutral: 'border-line bg-surface-sunken text-ink-2',
  outline: 'border-line bg-transparent text-ink-2',
  selected: 'border-transparent bg-accent text-ink-inverse',
};

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Tag({ tone = 'neutral', icon, className, children, ...rest }: TagProps) {
  return (
    <span className={[BASE, TONE[tone], 'cursor-default', className].filter(Boolean).join(' ')} {...rest}>
      {icon}
      {children}
    </span>
  );
}

interface TagButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  icon?: ReactNode;
  children?: ReactNode;
}

export function TagButton({ tone = 'neutral', icon, className, children, ...rest }: TagButtonProps) {
  return (
    <button
      type="button"
      className={[
        BASE,
        TONE[tone],
        'cursor-pointer [transition:transform_0.12s_ease,background-color_0.15s_ease] hover:-translate-y-px',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
