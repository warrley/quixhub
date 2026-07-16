import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
  interactive?: boolean;
  accent?: string;
  children?: ReactNode;
}

export function Card({ padding = 'md', interactive, accent, className, children, ...rest }: CardProps) {
  const classes = [styles.card, styles[`pad-${padding}`], interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} {...rest}>
      {accent && <div className={styles.accentBar} style={{ background: accent }} />}
      {children}
    </div>
  );
}

export function CardKicker({ children }: { children: ReactNode }) {
  return <div className={styles.kicker}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className={styles.title}>{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

export function CardMeta({ children }: { children: ReactNode }) {
  return <div className={styles.meta}>{children}</div>;
}
