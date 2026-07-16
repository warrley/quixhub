import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

function Wrapper({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      {children}
      {error ? <span className={styles.error}>{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, className, ...rest }: InputProps) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <input className={[styles.control, className].filter(Boolean).join(' ')} {...rest} />
    </Wrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextareaField({ label, hint, error, className, ...rest }: TextareaProps) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <textarea className={[styles.control, className].filter(Boolean).join(' ')} {...rest} />
    </Wrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function SelectField({ label, hint, error, className, children, ...rest }: SelectProps) {
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <div className={styles.selectWrap}>
        <select className={[styles.control, className].filter(Boolean).join(' ')} {...rest}>
          {children}
        </select>
        <ChevronDown size={16} />
      </div>
    </Wrapper>
  );
}
