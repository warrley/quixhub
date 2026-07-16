import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { disciplineById, pendingMaterials } from '../data/mock';
import styles from './ModerationQueue.module.css';

export default function ModerationQueue() {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const { show } = useToast();
  const items = pendingMaterials().filter((m) => !resolved.has(m.id));

  return (
    <div>
      <h1 className={styles.title}>Fila de moderação</h1>
      <p className={styles.subtitle}>Materiais enviados pelos alunos aguardando revisão.</p>

      {items.length === 0 ? (
        <EmptyState
          icon={<Check size={26} />}
          title="Fila vazia"
          description="Nenhum material aguardando moderação no momento."
        />
      ) : (
        items.map((m) => {
          const discipline = disciplineById(m.disciplineId);
          return (
            <Card key={m.id} padding="none">
              <div className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.title2}>{m.title}</div>
                  <div className={styles.meta}>
                    {discipline?.name} · {m.anonymous ? 'anônimo' : m.uploader} · {m.fileKind}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setResolved((s) => new Set(s).add(m.id));
                      show('Material rejeitado');
                    }}
                  >
                    <X size={15} /> Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setResolved((s) => new Set(s).add(m.id));
                      show('Material aprovado e publicado');
                    }}
                  >
                    <Check size={15} /> Aprovar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
