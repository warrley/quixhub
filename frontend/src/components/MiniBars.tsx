import type { DisciplineProfessorStats } from '@/data/types';

// Deliberately no aggregated "professor rating" number — see docs/vision.md
// → Resolved decisions. Compact and unlabeled — just a glance-level impression,
// no label/value text per topic, so lists with many professors stay short.
export function MiniBars({ stats }: { stats: DisciplineProfessorStats['stats'] }) {
  const bars: { value: number; tone: string; title: string }[] = [
    { value: stats.materialQuality, tone: 'var(--color-accent)', title: `Qualidade do material: ${stats.materialQuality.toFixed(1)}/5` },
    { value: stats.examDifficulty, tone: 'var(--color-warn)', title: `Nível das provas: ${stats.examDifficulty.toFixed(1)}/5` },
    { value: stats.workDifficulty, tone: 'var(--color-accent-3)', title: `Nível dos trabalhos: ${stats.workDifficulty.toFixed(1)}/5` },
  ];
  return (
    <div className="flex gap-1.5">
      {bars.map((b, i) => (
        <div key={i} title={b.title} className="h-[5px] flex-1 rounded-full bg-surface-sunken overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(b.value / 5) * 100}%`, background: b.tone }} />
        </div>
      ))}
    </div>
  );
}
