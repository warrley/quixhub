import type { ReactNode } from 'react';

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-[oklch(15%_0.02_262/55%)] backdrop-blur-[3px] flex items-center justify-center p-4 z-[100] [animation:fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface-raised rounded-lg border border-line shadow-lg p-6 [animation:pop_0.18s_ease]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-heading font-bold text-17 mb-2">{title}</div>
        <div className="text-13-5 text-ink-2 leading-[1.55] mb-6">{children}</div>
        {actions && <div className="flex justify-end gap-3">{actions}</div>}
      </div>
    </div>
  );
}
