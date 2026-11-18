'use client';

import { BadgeCheck, UserCheck, X } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { IraEntry } from '@/data/types';
import { useCampusSnapshot } from '@/lib/campusSnapshotContext';
import { computeIra } from '@/lib/ira';
import {
  semesterIndex,
  type CampusStatus,
  type CampusStudent,
} from '@/lib/iraCampus';
import { CAMPUS_UPDATED_AT } from '@/lib/iraCampusData';
import { clampIra } from '@/lib/statistics';
import { fmt } from './chartFormat';

const STATUS_TEXT: Record<CampusStatus, string> = {
  ativo: 'Ativo',
  formado: 'Concluído',
  trancado: 'Trancado',
};

/**
 * Checks whether the student's imported SIGAA transcript matches a record
 * in the real campus dataset (at `CAMPUS_UPDATED_AT`), lets them confirm
 * "yes, that's me", and opt in to displaying their name in the ranking.
 */
export function IraIdentityMatch({
  entries,
  ira,
  userName,
  claimed,
  showNameInRanking,
  onClaim,
  onToggleShowName,
}: {
  entries: IraEntry[];
  ira: number;
  userName: string;
  claimed: CampusStudent | null;
  showNameInRanking: boolean;
  onClaim: (student: CampusStudent | null) => void;
  onToggleShowName: (show: boolean) => void;
}) {
  const snapshot = useCampusSnapshot();
  const hasPdf = entries.some((e) => e.source === 'pdf');

  const { referenceIra, latestClosedSemester, isOlderTranscript } = useMemo(() => {
    const refIdx = semesterIndex(CAMPUS_UPDATED_AT);
    let maxClosed: { label: string; idx: number } | null = null;
    const upToRef: IraEntry[] = [];

    for (const e of entries) {
      const idx = semesterIndex(e.semester);
      if (e.situacao !== 'em_andamento' && idx !== null && (!maxClosed || idx > maxClosed.idx)) {
        maxClosed = { label: e.semester!, idx };
      }
      if (refIdx === null || idx === null || idx <= refIdx) {
        upToRef.push(e);
      }
    }

    const computedAtRef = upToRef.length > 0 ? computeIra(upToRef) : null;
    const target = clampIra(computedAtRef ?? ira);
    const older = Boolean(refIdx !== null && maxClosed && maxClosed.idx < refIdx);

    return {
      referenceIra: target,
      latestClosedSemester: maxClosed?.label ?? null,
      isOlderTranscript: older,
    };
  }, [entries, ira]);

  const best = snapshot?.available ? snapshot.identityMatch.best : null;

  if (claimed) {
    return (
      <Card
        padding="sm"
        className="mb-6 border-l-[3px]"
        style={{ borderLeftColor: 'var(--color-good)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BadgeCheck size={18} className="text-good shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="font-heading font-bold text-13 text-ink">
                Você confirmou sua nota na base SIGAA {CAMPUS_UPDATED_AT}
              </div>
              <div className="text-xs text-ink-2">
                {claimed.course} · Ingresso {claimed.ingresso} · IRA <b className="text-ink tabular-nums">{fmt(claimed.ira, 4)}</b>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNameInRanking}
                onChange={(e) => onToggleShowName(e.target.checked)}
                className="accent-[var(--color-accent)] w-4 h-4 cursor-pointer"
              />
              <span>Mostrar meu nome ({userName.split(' ')[0]}) no ranking</span>
            </label>
            <button
              type="button"
              onClick={() => onClaim(null)}
              className="inline-flex items-center gap-1 text-11-5 text-ink-3 hover:text-ink cursor-pointer"
              title="Desvincular registro confirmado"
            >
              <X size={13} aria-hidden />
              Desvincular
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (!hasPdf || !best) return null;

  return (
    <Card
      padding="sm"
      className="mb-6 border-l-[3px]"
      style={{ borderLeftColor: 'var(--color-accent)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <UserCheck size={18} className="text-accent shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <div className="font-heading font-bold text-13 text-ink">
              Você provavelmente é este registro na base SIGAA {CAMPUS_UPDATED_AT}
            </div>
            <div className="text-12-5 text-ink-2 mt-0.5">
              <b className="text-ink">{best.student.course}</b> · Ingresso <b className="text-ink">{best.student.ingresso}</b> ·{' '}
              {STATUS_TEXT[best.student.status]} · IRA <b className="text-accent-dark tabular-nums">{fmt(best.student.ira, 4)}</b>
              <span className="text-ink-3"> (seu histórico em {CAMPUS_UPDATED_AT}: {fmt(referenceIra, 4)})</span>
            </div>
            {isOlderTranscript && latestClosedSemester && (
              <div className="text-11 text-ink-3 mt-1">
                Seu histórico importado vai até {latestClosedSemester}, e a base do campus é de {CAMPUS_UPDATED_AT} — confirme
                apenas se sua nota não mudou desde então.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => onClaim(best.student)}>
            Sim, sou eu
          </Button>
        </div>
      </div>
    </Card>
  );
}
