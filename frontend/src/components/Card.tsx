import type { HTMLAttributes, ReactNode } from 'react';

const BASE =
  'bg-surface-raised border border-line rounded-lg shadow-sm relative overflow-hidden [transition:box-shadow_0.18s_ease,border-color_0.18s_ease,transform_0.18s_ease]';

const PAD: Record<'none' | 'sm' | 'md', string> = {
  md: 'p-5',
  sm: 'p-4',
  none: 'p-0',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
  interactive?: boolean;
  accent?: string;
  children?: ReactNode;
}

export function Card({ padding = 'md', interactive, accent, className, children, ...rest }: CardProps) {
  const classes = [
    BASE,
    PAD[padding],
    interactive ? 'cursor-pointer hover:shadow-md hover:border-line-strong hover:-translate-y-0.5' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {accent && <div className="absolute top-2.5 bottom-2.5 left-2.5 w-1.5 rounded-full" style={{ background: accent }} />}
      {children}
    </div>
  );
}

export function CardKicker({ children }: { children: ReactNode }) {
  return <div className="font-heading font-bold text-11 tracking-[0.03em] uppercase text-accent-2-ink mb-1">{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="font-heading font-bold text-15 text-ink">{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="text-13 text-ink-2 leading-[1.5]">{children}</div>;
}

export function CardMeta({ children }: { children: ReactNode }) {
  return <div className="text-11-5 font-semibold text-ink-3">{children}</div>;
}
