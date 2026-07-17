import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-2">
      <div
        className="relative w-[84px] h-[84px] rounded-xl flex items-center justify-center text-accent shadow-md mb-3"
        style={{ backgroundImage: 'var(--gradient-hero), linear-gradient(135deg, var(--color-accent-tint), var(--color-accent-2-tint))' }}
      >
        {icon}
      </div>
      <div className="font-heading font-bold text-17 text-ink">{title}</div>
      <p className="text-13-5 leading-[1.55] text-ink-2 max-w-[320px]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
