'use client';

import { ArrowUp, Crown, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import { clampIra } from '@/lib/statistics';
import {
  MIN_GROUP_SIZE,
  buildRanking,
  excludeClaimedStudent,
  filterForRanking,
  rankingFilterBlocker,
  type CampusStudent,
  type RankingCohort,
  type RankingFilter,
  type RankingRow,
  type RankingScope,
} from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, CAMPUS_UPDATED_AT } from '@/lib/iraCampusData';
import { fmt, ordinal } from './chartFormat';

const PODIUM_SIZE = 5;

const PLACE_NAME: Record<number, string> = { 1: 'Primeiro', 2: 'Segundo', 3: 'Terceiro', 4: 'Quarto', 5: 'Quinto' };

const COHORT_OPTIONS: { value: RankingCohort; label: string; title: string }[] = [
  { value: 'ativos', label: 'Ativos', title: 'Todos os alunos ainda matriculados' },
  { value: 'turma', label: 'Minha turma', title: 'Ativos que entraram no mesmo semestre que você' },
  {
    value: 'turmaAoFim',
    label: 'Da minha turma em diante',
    title: 'Ativos da sua turma e de turmas anteriores (veteranos até a formatura, sem calouros)',
  },
  { value: 'periodo', label: 'Por período', title: 'Ativos que ingressaram dentro de um intervalo de semestres' },
  { value: 'todos', label: 'Todos', title: 'Ativos, formados e trancados' },
];

// Gold / silver / bronze for the podium; the rest stay neutral.
const MEDAL: Record<number, { bg: string; fg: string }> = {
  1: { bg: 'var(--color-accent-2-tint)', fg: 'var(--color-accent-2-dark)' },
  2: { bg: 'var(--color-surface-sunken)', fg: 'var(--color-ink-2)' },
  3: { bg: 'var(--color-accent-4-tint)', fg: 'var(--color-accent-4-dark)' },
};

function PositionBadge({ position, isYou }: { position: number; isYou: boolean }) {
  const medal = !isYou ? MEDAL[position] : undefined;
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center w-9 h-7 rounded-full font-heading font-bold text-12-5"
      style={
        isYou
          ? { background: 'var(--color-accent)', color: 'var(--color-ink-inverse)' }
          : { background: medal?.bg ?? 'transparent', color: medal?.fg ?? 'var(--color-ink-3)' }
      }
    >
      {position === 1 && !isYou ? <Crown size={14} aria-label="1º" /> : ordinal(position)}
    </span>
  );
}

function Row({ row, max, displayName }: { row: RankingRow; max: number; displayName?: string | null }) {
  const label = row.isYou
    ? displayName
      ? displayName
      : 'Você'
    : (PLACE_NAME[row.position] ?? `${ordinal(row.position)} lugar`);

  return (
    <li
      className={`flex items-center gap-3 h-11 px-2.5 rounded-md border ${
        row.isYou ? 'border-accent bg-accent-tint shadow-sm' : 'border-transparent'
      }`}
    >
      <PositionBadge position={row.position} isYou={row.isYou} />
      <span
        className={`text-13 w-[112px] shrink-0 truncate ${row.isYou ? 'font-heading font-bold text-accent-dark' : 'text-ink-2'}`}
        title={label}
      >
        {label}
      </span>
      <span className="flex-1 h-1.5 rounded-full bg-surface-sunken overflow-hidden" aria-hidden>
        <span
          className="block h-full rounded-full [transition:width_0.4s_ease]"
          style={{ width: `${(row.ira / max) * 100}%`, background: row.isYou ? 'var(--color-accent)' : 'var(--color-line-strong)' }}
        />
      </span>
      <span className={`font-heading font-bold text-13-5 tabular-nums w-[60px] text-right ${row.isYou ? 'text-accent-dark' : 'text-ink'}`}>
        {fmt(row.ira, 4)}
      </span>
    </li>
  );
}

/**
 * Top 5 of the chosen group with their IRA. When you're outside the top 5,
 * a highlighted sixth card shows your real position and IRA; when you're in
 * it, you take your place in the list and it stays at five rows.
 */
export function IraRanking({
  ira,
  myCourse,
  ingresso,
  ingressoOptions,
  onIngressoChange,
  filter,
  onFilterChange,
  claimedStudent = null,
  displayName = null,
}: {
  ira: number;
  /** The user's own course, already mapped onto the export's names. */
  myCourse: string | null;
  ingresso: string | null;
  ingressoOptions: string[];
  onIngressoChange: (ingresso: string | null) => void;
  filter: RankingFilter;
  onFilterChange: (filter: RankingFilter) => void;
  claimedStudent?: CampusStudent | null;
  displayName?: string | null;
}) {
  const myIra = clampIra(ira);
  const me = useMemo(() => ({ course: myCourse, ingresso }), [myCourse, ingresso]);
  const blocker = rankingFilterBlocker(filter, me);
  const pool = useMemo(() => excludeClaimedStudent(CAMPUS_STUDENTS, claimedStudent), [claimedStudent]);
  const group = useMemo(() => filterForRanking(pool, filter, me), [pool, filter, me]);
  const ranking = useMemo(() => buildRanking(group.map((s) => s.ira), myIra, PODIUM_SIZE), [group, myIra]);
  const tooSmall = !blocker && group.length < MIN_GROUP_SIZE;
  const max = Math.max(10, ...ranking.rows.map((r) => r.ira));

  const scopeText = filter.scope === 'curso' ? myCourse ?? 'seu curso' : 'campus';

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <CardKicker>Ranking</CardKicker>
          <CardTitle>Top {PODIUM_SIZE} do {filter.scope === 'curso' ? 'curso' : 'campus'}</CardTitle>
        </div>
        <Trophy size={20} className="text-accent-2-dark shrink-0 mt-1" aria-hidden />
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <Segmented<RankingScope>
          size="sm"
          ariaLabel="Abrangência do ranking"
          value={filter.scope}
          onChange={(scope) => onFilterChange({ ...filter, scope })}
          options={[
            { value: 'curso', label: 'Meu curso', title: myCourse ?? 'Curso não informado', disabled: !myCourse },
            { value: 'campus', label: 'Campus', title: 'Todos os cursos de Quixadá' },
          ]}
        />
        <Segmented<RankingCohort>
          size="sm"
          ariaLabel="Grupo do ranking"
          value={filter.cohort}
          onChange={(cohort) => onFilterChange({ ...filter, cohort })}
          options={COHORT_OPTIONS}
        />
        {(filter.cohort === 'turma' || filter.cohort === 'turmaAoFim') && (
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-11-5 text-ink-2">
              Entrei em
              <select
                value={ingresso ?? ''}
                onChange={(e) => onIngressoChange(e.target.value || null)}
                className="font-heading font-semibold text-12 text-ink bg-surface border border-line rounded-md py-1 px-2 cursor-pointer hover:border-accent focus:border-accent outline-none"
              >
                <option value="">semestre…</option>
                {ingressoOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {filter.cohort === 'turmaAoFim' && ingresso && (
              <span className="text-10-5 text-ink-3">
                Inclui ativos de {ingresso} e de turmas anteriores (veteranos até a formatura, sem calouros).
              </span>
            )}
          </div>
        )}
        {filter.cohort === 'periodo' && (
          <div className="flex items-center gap-2 flex-wrap text-11-5 text-ink-2">
            <span>Ingresso de</span>
            <select
              value={filter.fromIngresso ?? ''}
              onChange={(e) => onFilterChange({ ...filter, fromIngresso: e.target.value || null })}
              className="font-heading font-semibold text-12 text-ink bg-surface border border-line rounded-md py-1 px-2 cursor-pointer hover:border-accent focus:border-accent outline-none"
            >
              <option value="">início…</option>
              {ingressoOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>até</span>
            <select
              value={filter.toIngresso ?? ''}
              onChange={(e) => onFilterChange({ ...filter, toIngresso: e.target.value || null })}
              className="font-heading font-semibold text-12 text-ink bg-surface border border-line rounded-md py-1 px-2 cursor-pointer hover:border-accent focus:border-accent outline-none"
            >
              <option value="">fim…</option>
              {ingressoOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {blocker ? (
        <p className="text-13 text-ink-3 border border-dashed border-line rounded-md p-4 text-center my-auto">{blocker}</p>
      ) : tooSmall ? (
        <p className="text-13 text-ink-3 border border-dashed border-line rounded-md p-4 text-center my-auto">
          Menos de {MIN_GROUP_SIZE} alunos neste recorte — o ranking fica escondido para não expor ninguém.
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-0.5" aria-label={`Top ${PODIUM_SIZE}`}>
            {ranking.rows.map((row, i) => (
              <Row key={i} row={row} max={max} displayName={displayName} />
            ))}
          </ol>

          {!ranking.youInTop && (
            <>
              <div className="flex justify-center gap-1 my-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-line-strong" />
                ))}
              </div>
              <div
                className="flex items-center gap-3 px-3 py-3 rounded-md border-1-5 shadow-md"
                style={{ borderColor: 'var(--color-accent)', background: 'linear-gradient(135deg, var(--color-accent-tint), var(--color-accent-3-tint))' }}
              >
                <PositionBadge position={ranking.you.position} isYou />
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-14-5 text-accent-dark leading-tight truncate">
                    {displayName ? displayName : 'Você'}
                  </div>
                  <div className="text-11 text-ink-2">
                    {ordinal(ranking.you.position)} de {ranking.total.toLocaleString('pt-BR')}
                  </div>
                </div>
                <span className="font-heading font-extrabold text-21 tabular-nums text-accent-dark">{fmt(myIra, 4)}</span>
              </div>
            </>
          )}

          <div className="mt-3 flex flex-col gap-1 text-11-5 text-ink-2">
            {ranking.youInTop ? (
              <span className="flex items-center gap-1.5">
                <Crown size={13} className="text-accent-2-dark" aria-hidden />
                Você está no top {PODIUM_SIZE} — {ordinal(ranking.you.position)} de {ranking.total.toLocaleString('pt-BR')}.
              </span>
            ) : (
              ranking.podiumIra !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Trophy size={13} className="text-accent-2-dark" aria-hidden />
                  Para entrar no top {PODIUM_SIZE}: IRA <b className="text-ink tabular-nums">{fmt(ranking.podiumIra, 4)}</b> (+
                  {fmt(Math.max(0, ranking.podiumIra - myIra), 4)})
                </span>
              )
            )}
            {ranking.nextStep && !ranking.youInTop && ranking.nextStep.ira !== ranking.podiumIra && (
              <span className="flex items-center gap-1.5">
                <ArrowUp size={13} className="text-good" aria-hidden />
                Com <span className="tabular-nums font-semibold">{fmt(ranking.nextStep.ira, 4)}</span> (+
                {fmt(Math.max(0.0001, ranking.nextStep.ira - myIra), 4)}) você sobe{' '}
                {ranking.nextStep.places === 1 ? '1 posição' : `${ranking.nextStep.places} posições`}.
              </span>
            )}
          </div>
        </>
      )}

      <p className="text-10 text-ink-3 mt-auto pt-3">
        {scopeText} · SIGAA {CAMPUS_UPDATED_AT} · anônimo: só posição e nota. Você entra como mais um aluno na lista.
      </p>
    </Card>
  );
}
