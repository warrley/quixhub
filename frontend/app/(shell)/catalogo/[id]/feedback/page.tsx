'use client';

import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { TagButton } from '@/components/Tag';
import { TextareaField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { disciplineById } from '@/data/mock';

const EXAM_FORMATS = ['Prova', 'Trabalho', 'Seminário', 'Projeto', 'Prova + Trabalho'];
const TEACHING_STYLES = ['Slides', 'Quadro', 'PDF/apostila', 'Misto'];
const ATTENDANCE = ['Sempre cobrada', 'Às vezes', 'Nunca cobrada'];
const WORKLOAD_SCALE = ['Leve', 'Moderada', 'Média', 'Alta', 'Muito alta'];

const SCALE_OPT_BASE =
  'flex-1 text-center py-2.5 px-1 rounded-md border-1-5 border-line bg-surface text-xs font-semibold text-ink-2 cursor-pointer transition-all duration-150';
const YES_NO_BASE = 'py-2.5 px-5 rounded-md border-1-5 border-line bg-surface text-13 font-semibold text-ink-2 cursor-pointer';
const ACTIVE = 'border-accent bg-accent-tint text-accent-dark';

export default function FeedbackSubmit() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const discipline = disciplineById(params.id);

  const [workload, setWorkload] = useState<string>('Média');
  const [examFormats, setExamFormats] = useState<string[]>([]);
  const [groupWork, setGroupWork] = useState<boolean | null>(null);
  const [teachingStyle, setTeachingStyle] = useState<string>('');
  const [attendance, setAttendance] = useState<string>('');

  if (!discipline) redirect('/catalogo');

  function toggleExamFormat(f: string) {
    setExamFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  return (
    <div>
      <Link href={`/catalogo/${discipline.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 no-underline my-2 mb-4">
        <ArrowLeft size={13} /> {discipline.name}
      </Link>
      <h1 className="font-heading font-bold text-22 mb-1">Feedback da disciplina</h1>
      <p className="text-13 text-ink-2 mb-2">Ajude outros alunos com uma avaliação estruturada e honesta.</p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-good mb-6">
        <ShieldCheck size={15} /> Suas respostas são anônimas por padrão.
      </div>

      <form
        className="max-w-[520px] flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          show('Feedback enviado — obrigado!');
          router.push(`/catalogo/${discipline.id}`);
        }}
      >
        <div className="flex flex-col gap-2.5">
          <span className="font-heading font-semibold text-12-5 text-ink-2">Carga de trabalho</span>
          <div className="flex gap-1.5">
            {WORKLOAD_SCALE.map((w) => (
              <div
                key={w}
                className={`${SCALE_OPT_BASE} ${workload === w ? ACTIVE : ''}`}
                onClick={() => setWorkload(w)}
              >
                {w}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-heading font-semibold text-12-5 text-ink-2">Formato de avaliação (múltipla escolha)</span>
          <div className="flex gap-2 flex-wrap">
            {EXAM_FORMATS.map((f) => (
              <TagButton key={f} tone={examFormats.includes(f) ? 'selected' : 'outline'} onClick={() => toggleExamFormat(f)}>
                {f}
              </TagButton>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-heading font-semibold text-12-5 text-ink-2">Trabalho em grupo?</span>
          <div className="flex gap-2">
            <div className={`${YES_NO_BASE} ${groupWork === true ? ACTIVE : ''}`} onClick={() => setGroupWork(true)}>
              Sim
            </div>
            <div className={`${YES_NO_BASE} ${groupWork === false ? ACTIVE : ''}`} onClick={() => setGroupWork(false)}>
              Não
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-heading font-semibold text-12-5 text-ink-2">Estilo de ensino</span>
          <div className="flex gap-2 flex-wrap">
            {TEACHING_STYLES.map((t) => (
              <TagButton key={t} tone={teachingStyle === t ? 'selected' : 'outline'} onClick={() => setTeachingStyle(t)}>
                {t}
              </TagButton>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-heading font-semibold text-12-5 text-ink-2">Frequência é cobrada?</span>
          <div className="flex gap-2 flex-wrap">
            {ATTENDANCE.map((a) => (
              <TagButton key={a} tone={attendance === a ? 'selected' : 'outline'} onClick={() => setAttendance(a)}>
                {a}
              </TagButton>
            ))}
          </div>
        </div>

        <TextareaField label="Comentário livre (opcional)" placeholder="Algo mais que ajude a turma..." rows={3} />

        <Button type="submit" block>
          Enviar feedback
        </Button>
      </form>
    </div>
  );
}
