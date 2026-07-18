'use client';

import { ArrowLeft, Lock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { FeedbackForm } from '@/components/FeedbackForm';
import { StatBar } from '@/components/StatBar';
import { Tag } from '@/components/Tag';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/Skeleton';
import type { FeedbackComment, Offering, OfferingStats, OfferingWithDiscipline } from '@/data/types';

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

export default function OfferingDetail() {
  const params = useParams<{ id: string }>();
  const [offering, setOffering] = useState<OfferingWithDiscipline | null | undefined>(undefined);
  const [stats, setStats] = useState<OfferingStats | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [siblings, setSiblings] = useState<Offering[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  function load() {
    api.getOffering(params.id).then(setOffering).catch(() => setOffering(null));
    api.getOfferingStats(params.id).then(setStats);
    api.getOfferingComments(params.id).then(setComments);
  }

  useEffect(load, [params.id]);

  useEffect(() => {
    if (!offering) return;
    api.getOfferingsByDiscipline(offering.disciplineId).then((all) =>
      setSiblings(all.filter((o) => o.professor === offering.professor && o.id !== offering.id)),
    );
  }, [offering]);

  if (offering === null) redirect('/opinioes');
  if (offering === undefined) {
    return (
      <div>
        <Skeleton className="h-[120px] rounded-lg my-2 mb-6" />
        <div className="flex flex-col gap-2.5 max-w-[500px]">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-[120px] rounded-lg relative flex items-end py-5 px-6 my-2 mb-6 overflow-hidden text-white bg-gradient-brand before:content-[''] before:absolute before:inset-0 before:[background:radial-gradient(120%_160%_at_100%_0%,oklch(100%_0_0_/_18%),transparent_60%)]">
        <Link href="/opinioes" className="absolute top-4 left-5 text-xs font-semibold text-white/90 no-underline flex items-center gap-1">
          <ArrowLeft size={13} /> Opiniões
        </Link>
        <div>
          <div className="text-11 font-semibold text-white/80">{offering.discipline.code} · {offering.semester}</div>
          <h1 className="font-heading font-bold text-xl">{offering.discipline.name}</h1>
          <div className="text-13 text-white/90">{offering.professor}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 min-[860px]:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <span className="font-heading font-bold text-12-5">Feedback</span>
            <span className="text-11 font-semibold text-ink-3">{stats?.totalReviews ?? 0} respostas</span>
          </div>

          {stats && stats.totalReviews > 0 ? (
            <>
              <StatBar label="Qualidade do material" value={`${stats.materialQuality.toFixed(1)}/5`} percent={(stats.materialQuality / 5) * 100} tone="var(--color-accent)" />
              <StatBar label="Nível das provas" value={`${stats.examDifficulty.toFixed(1)}/5`} percent={(stats.examDifficulty / 5) * 100} tone="var(--color-warn)" />
              <StatBar label="Nível dos trabalhos" value={`${stats.workDifficulty.toFixed(1)}/5`} percent={(stats.workDifficulty / 5) * 100} tone="var(--color-accent-3)" />
              <div className="flex gap-1.5 mt-3 mb-6 flex-wrap">
                {stats.attendance && <Tag tone="accent2">{ATTENDANCE_LABEL[stats.attendance] ?? stats.attendance}</Tag>}
                {stats.groupWork && <Tag tone="accent3">Trabalho em grupo: {GROUP_WORK_LABEL[stats.groupWork] ?? stats.groupWork}</Tag>}
              </div>
            </>
          ) : (
            <p className="text-13 text-ink-2 mb-6">Nenhuma opinião ainda — seja o primeiro!</p>
          )}

          {siblings.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-baseline mb-1.5">
                <div className="font-heading font-bold text-12-5">Outros semestres com {offering.professor}</div>
                <Link
                  href={`/opinioes/professor/${offering.disciplineId}?professor=${encodeURIComponent(offering.professor)}`}
                  className="text-11 font-semibold text-accent-dark no-underline whitespace-nowrap"
                >
                  Ver geral →
                </Link>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {siblings.map((s) => (
                  <Link key={s.id} href={`/opinioes/${s.id}`}>
                    <Tag tone="outline">{s.semester}</Tag>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="font-heading font-bold text-12-5 mb-1.5">Comentários anônimos</div>
          <div className="flex flex-col gap-2">
            {comments.length === 0 && <p className="text-13 text-ink-2">Nenhum comentário ainda.</p>}
            {comments.map((c, i) => (
              <div key={i} className="border border-line bg-surface rounded-md py-3 px-3.5">
                <p className="text-13 text-ink leading-[1.5]">{c.comment}</p>
                <p className="text-11 text-ink-3 mt-1.5">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <Button block onClick={() => setDialogOpen(true)}>
              <MessageSquare size={16} /> Dar minha opinião
            </Button>
          </div>

          <div className="flex gap-2 bg-accent-tint border border-line rounded-md py-3 px-3.5 text-xs leading-[1.5] text-ink-2">
            <Lock size={15} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
            <span>
              Sua identidade é protegida por criptografia. Usamos um hash com chave secreta — nem o administrador
              do sistema consegue saber quem você é.
            </span>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} title="Dar minha opinião" onClose={() => setDialogOpen(false)}>
        <FeedbackForm
          offeringId={offering.id}
          onSubmitted={() => {
            setDialogOpen(false);
            load();
          }}
        />
      </Dialog>
    </div>
  );
}
