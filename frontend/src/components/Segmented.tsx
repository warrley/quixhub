import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Native tooltip — short explanation of what the option means. */
  title?: string;
  disabled?: boolean;
}

/** Compact pill-style single-choice toggle (radio group semantics). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? 'py-1 px-2.5 text-11-5' : 'py-1.5 px-3 text-12-5';
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 p-1 rounded-full bg-surface-sunken border border-line">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 font-heading font-semibold rounded-full cursor-pointer whitespace-nowrap [transition:background-color_0.15s_ease,color_0.15s_ease,box-shadow_0.15s_ease] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-accent-tint)] ${pad} ${
              active ? 'bg-surface-raised text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
