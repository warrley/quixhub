import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const CONTROL =
  'border-1-5 border-line rounded-md px-3.5 py-3 font-body text-sm text-ink bg-surface placeholder:text-ink-3 [transition:border-color_0.15s_ease,box-shadow_0.15s_ease,background-color_0.15s_ease] hover:border-line-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--color-accent-tint)]';

function Wrapper({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 mb-4">
      {label && <span className="font-heading font-semibold text-xs text-ink-2">{label}</span>}
      {children}
      {error ? (
        <span className="text-xs text-danger font-semibold">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-3">{hint}</span>
      ) : null}
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
      <input className={[CONTROL, className].filter(Boolean).join(' ')} {...rest} />
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
      <textarea className={[CONTROL, 'resize-y min-h-[80px]', className].filter(Boolean).join(' ')} {...rest} />
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
      <div className="relative">
        <select className={[CONTROL, 'appearance-none pr-9', className].filter(Boolean).join(' ')} {...rest}>
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
      </div>
    </Wrapper>
  );
}
