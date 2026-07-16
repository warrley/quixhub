import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import styles from './Tag.module.css';

type Tone = 'accent' | 'accent2' | 'accent3' | 'good' | 'warn' | 'danger' | 'neutral' | 'outline' | 'selected';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Tag({ tone = 'neutral', icon, className, children, ...rest }: TagProps) {
  return (
    <span className={[styles.tag, styles[tone], className].filter(Boolean).join(' ')} {...rest}>
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
    <button type="button" className={[styles.tag, styles[tone], className].filter(Boolean).join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  );
}
