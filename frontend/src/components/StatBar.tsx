export function StatBar({
  label,
  value,
  percent,
  tone = 'var(--color-accent)',
}: {
  label: string;
  value: string;
  percent: number;
  tone?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-medium text-ink-2 mb-[5px]">
        <span>{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </div>
      <div className="h-[7px] rounded-full bg-surface-sunken overflow-hidden">
        <div
          className="h-full rounded-full [transition:width_0.4s_ease]"
          style={{ width: `${percent}%`, background: tone }}
        />
      </div>
    </div>
  );
}
