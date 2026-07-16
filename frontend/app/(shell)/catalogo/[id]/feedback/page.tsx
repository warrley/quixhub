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
import styles from './FeedbackSubmit.module.css';

const EXAM_FORMATS = ['Prova', 'Trabalho', 'Seminário', 'Projeto', 'Prova + Trabalho'];
const TEACHING_STYLES = ['Slides', 'Quadro', 'PDF/apostila', 'Misto'];
const ATTENDANCE = ['Sempre cobrada', 'Às vezes', 'Nunca cobrada'];
const WORKLOAD_SCALE = ['Leve', 'Moderada', 'Média', 'Alta', 'Muito alta'];

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
      <Link href={`/catalogo/${discipline.id}`} className={styles.back}>
        <ArrowLeft size={13} /> {discipline.name}
      </Link>
      <h1 className={styles.title}>Feedback da disciplina</h1>
      <p className={styles.subtitle}>Ajude outros alunos com uma avaliação estruturada e honesta.</p>
      <div className={styles.anonNote}>
        <ShieldCheck size={15} /> Suas respostas são anônimas por padrão.
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          show('Feedback enviado — obrigado!');
          router.push(`/catalogo/${discipline.id}`);
        }}
      >
        <div className={styles.group}>
          <span className={styles.groupLabel}>Carga de trabalho</span>
          <div className={styles.scale}>
            {WORKLOAD_SCALE.map((w) => (
              <div
                key={w}
                className={[styles.scaleOpt, workload === w ? styles.scaleOptActive : ''].join(' ')}
                onClick={() => setWorkload(w)}
              >
                {w}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Formato de avaliação (múltipla escolha)</span>
          <div className={styles.chipRow}>
            {EXAM_FORMATS.map((f) => (
              <TagButton key={f} tone={examFormats.includes(f) ? 'selected' : 'outline'} onClick={() => toggleExamFormat(f)}>
                {f}
              </TagButton>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Trabalho em grupo?</span>
          <div className={styles.yesNo}>
            <div
              className={[styles.yesNoOpt, groupWork === true ? styles.yesNoActive : ''].join(' ')}
              onClick={() => setGroupWork(true)}
            >
              Sim
            </div>
            <div
              className={[styles.yesNoOpt, groupWork === false ? styles.yesNoActive : ''].join(' ')}
              onClick={() => setGroupWork(false)}
            >
              Não
            </div>
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Estilo de ensino</span>
          <div className={styles.chipRow}>
            {TEACHING_STYLES.map((t) => (
              <TagButton key={t} tone={teachingStyle === t ? 'selected' : 'outline'} onClick={() => setTeachingStyle(t)}>
                {t}
              </TagButton>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Frequência é cobrada?</span>
          <div className={styles.chipRow}>
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
