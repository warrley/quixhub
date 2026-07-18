'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { StatBar } from '@/components/StatBar';
import { Tag } from '@/components/Tag';
import { api } from '@/lib/api';
import type { Discipline, DisciplineProfessorStats, FeedbackComment, Offering } from '@/data/types';

const ATTENDANCE_LABEL: Record<string, string> = {
  sempre: 'Sempre cobrada',
  as_vezes: 'Às vezes cobrada',
  nao_cobra: 'Não cobra',
};

const GROUP_WORK_LABEL: Record<string, string> = {
  frequente: 'Frequente',
  raro: 'Raro',
  nao_tem: 'Não tem',
};

interface CommentWithSemester extends FeedbackComment {
  semester: string;
}

// The "geral" view — a professor's combined record teaching one discipline,
// merged across every semester (offering) they've had it. Contrasts with
// /opinioes/[id], which is always one specific semester's offering.
export default function ProfessorDiscipline() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const params = useParams<{ disciplineId: string }>();
  const searchParams = useSearchParams();
  const professor = searchParams.get('professor') ?? '';

  const [discipline, setDiscipline] = useState<Discipline | null | undefined>(undefined);
  const [stats, setStats] = useState<DisciplineProfessorStats | null | undefined>(undefined);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [comments, setComments] = useState<CommentWithSemester[]>([]);

  useEffect(() => {
    if (!professor) return;
    api
      .getDiscipline(params.disciplineId)
      .then(setDiscipline)
      .catch(() => setDiscipline(null));
    api
      .getDisciplineStats(params.disciplineId)
      .then((all) => setStats(all.find((s) => s.professor === professor) ?? null))
      .catch(() => setStats(null));
    api
      .getOfferingsByDiscipline(params.disciplineId)
      .then((all) => setOfferings(all.filter((o) => o.professor === professor)));
  }, [params.disciplineId, professor]);

  useEffect(() => {
    if (offerings.length === 0) return;
    Promise.all(
      offerings.map((o) => api.getOfferingComments(o.id).then((cs) => cs.map((c) => ({ ...c, semester: o.semester })))),
    ).then((groups) => {
      const merged = groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setComments(merged);
    });
  }, [offerings]);

  if (!professor || discipline === null) redirect('/opinioes');
  if (discipline === undefined) return null;

  const sortedOfferings = [...offerings].sort((a, b) => b.semester.localeCompare(a.semester));
  const mostRecent = sortedOfferings[0];

  return (
    <div>
      <div className="h-[120px] rounded-lg relative flex items-end py-5 px-6 my-2 mb-6 overflow-hidden text-white bg-gradient-brand before:content-[''] before:absolute before:inset-0 before:[background:radial-gradient(120%_160%_at_100%_0%,oklch(100%_0_0_/_18%),transparent_60%)]">
        <Link href="/opinioes" className="absolute top-4 left-5 text-xs font-semibold text-white/90 no-underline flex items-center gap-1">
          <ArrowLeft size={13} /> Opiniões
        </Link>
        <div>
          <div className="text-11 font-semibold text-white/80">{discipline.code} · todos os semestres</div>
          <h1 className="font-heading font-bold text-xl">{discipline.name}</h1>
          <div className="text-13 text-white/90">{professor}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 min-[860px]:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <span className="font-heading font-bold text-12-5">Feedback geral</span>
            <span className="text-11 font-semibold text-ink-3">{stats?.stats.totalReviews ?? 0} respostas</span>
          </div>

          {stats && stats.stats.totalReviews > 0 ? (
            <>
              <StatBar label="Qualidade do material" value={`${stats.stats.materialQuality.toFixed(1)}/5`} percent={(stats.stats.materialQuality / 5) * 100} tone="var(--color-accent)" />
              <StatBar label="Nível das provas" value={`${stats.stats.examDifficulty.toFixed(1)}/5`} percent={(stats.stats.examDifficulty / 5) * 100} tone="var(--color-warn)" />
              <StatBar label="Nível dos trabalhos" value={`${stats.stats.workDifficulty.toFixed(1)}/5`} percent={(stats.stats.workDifficulty / 5) * 100} tone="var(--color-accent-3)" />
              <div className="flex gap-1.5 mt-3 mb-6 flex-wrap">
                {stats.stats.attendance && <Tag tone="accent2">{ATTENDANCE_LABEL[stats.stats.attendance] ?? stats.stats.attendance}</Tag>}
                {stats.stats.groupWork && <Tag tone="accent3">Trabalho em grupo: {GROUP_WORK_LABEL[stats.stats.groupWork] ?? stats.stats.groupWork}</Tag>}
              </div>
            </>
          ) : (
            <p className="text-13 text-ink-2 mb-6">Nenhuma opinião ainda — seja o primeiro!</p>
          )}

          {sortedOfferings.length > 0 && (
            <div className="mb-6">
              <div className="font-heading font-bold text-12-5 mb-1.5">Ver um semestre específico</div>
              <div className="flex gap-1.5 flex-wrap">
                {sortedOfferings.map((o) => (
                  <Link key={o.id} href={`/opinioes/${o.id}`}>
                    <Tag tone="outline">{o.semester}</Tag>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="font-heading font-bold text-12-5 mb-1.5">Comentários anônimos (todos os semestres)</div>
          <div className="flex flex-col gap-2">
            {comments.length === 0 && <p className="text-13 text-ink-2">Nenhum comentário ainda.</p>}
            {comments.map((c, i) => (
              <div key={i} className="border border-line bg-surface rounded-md py-3 px-3.5">
                <p className="text-13 text-ink leading-[1.5]">{c.comment}</p>
                <p className="text-11 text-ink-3 mt-1.5">
                  {c.semester} · {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          {mostRecent && (
            <Link href={`/opinioes/${mostRecent.id}`}>
              <Button block>
                <MessageSquare size={16} /> Dar minha opinião ({mostRecent.semester})
              </Button>
            </Link>
          )}
          <p className="text-11 text-ink-3 mt-2 leading-[1.5]">
            Sua opinião é registrada pro semestre específico que você cursou — por isso o envio abre na turma de{' '}
            {mostRecent?.semester}, a mais recente.
          </p>
        </div>
      </div>
    </div>
  );
}
