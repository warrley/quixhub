import { Code2, Download, FileText, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { Card } from './Card';
import type { Material } from '../data/types';

const TYPE_LABEL: Record<Material['type'], string> = {
  prova: 'Prova anterior',
  resumo: 'Resumo',
  codigo: 'Código',
  trabalho: 'Trabalho',
};

const TYPE_TONE: Record<Material['type'], { bg: string; ink: string }> = {
  prova: { bg: 'var(--gradient-brand)', ink: 'var(--color-accent-dark)' },
  resumo: { bg: 'var(--gradient-warm)', ink: 'var(--color-accent-2-ink)' },
  codigo: { bg: 'linear-gradient(135deg, var(--color-accent-3), var(--color-accent))', ink: 'var(--color-accent-3-dark)' },
  trabalho: { bg: 'linear-gradient(135deg, var(--color-accent-4), var(--color-accent-2))', ink: 'var(--color-accent-4-dark)' },
};

export function MaterialCard({ material }: { material: Material }) {
  const tone = TYPE_TONE[material.type];
  const Icon = material.type === 'codigo' ? Code2 : FileText;
  return (
    <Card interactive padding="none">
      <Link href={`/materiais/${material.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="flex gap-3.5 p-4 items-center">
          <div
            className="w-[42px] h-[42px] rounded-md shrink-0 flex items-center justify-center text-white relative shadow-sm after:content-[''] after:absolute after:top-0 after:right-0 after:w-0 after:h-0 after:border-solid after:[border-width:0_11px_11px_0] after:[border-color:transparent_oklch(0%_0%_0%_/_18%)_transparent_transparent] after:rounded-tr-md"
            style={{ background: tone.bg }}
          >
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-10 tracking-[0.02em] mb-0.5" style={{ color: tone.ink }}>
              {TYPE_LABEL[material.type].toUpperCase()} · {material.fileKind}
            </div>
            <div className="font-semibold text-13 text-ink overflow-hidden text-ellipsis whitespace-nowrap">{material.title}</div>
            <div className="text-11 font-medium text-ink-2 mt-0.5 flex items-center gap-1">
              <ThumbsUp size={11} />
              {material.helpfulCount} acharam útil
            </div>
          </div>
          <div className="shrink-0">
            <Download size={17} color="var(--color-ink-3)" />
          </div>
        </div>
      </Link>
    </Card>
  );
}
