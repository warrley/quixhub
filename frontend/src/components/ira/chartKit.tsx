// Shared React UI helpers for the /ira campus charts.
export function StatBadge({
  value,
  label,
  tone,
  tint,
  title,
}: {
  value: string;
  label: string;
  tone: string;
  tint: string;
  title?: string;
}) {
  return (
    <div className="rounded-md px-4 py-3 text-center min-w-[110px] flex-1" style={{ background: tint }} title={title}>
      <div className="font-heading font-extrabold text-19" style={{ color: tone }}>
        {value}
      </div>
      <div className="text-10 text-ink-3 mt-0.5">{label}</div>
    </div>
  );
}

export function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full text-13 text-ink-3 text-center py-10 px-4 border border-dashed border-line rounded-md">
      {children}
    </div>
  );
}
