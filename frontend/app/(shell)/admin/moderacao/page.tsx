'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { disciplineById, pendingMaterials } from '@/data/mock';

export default function ModerationQueue() {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const { show } = useToast();
  const items = pendingMaterials().filter((m) => !resolved.has(m.id));

  return (
    <div>
      <h1 className="font-heading font-bold text-22 my-2 mb-1">Fila de moderação</h1>
      <p className="text-13 text-ink-2 mb-6">Materiais enviados pelos alunos aguardando revisão.</p>

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
              <div className="flex items-center gap-3.5 p-4 mb-9px">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-13-5">{m.title}</div>
                  <div className="text-11-5 text-ink-2 mt-0.5">
                    {discipline?.name} · {m.anonymous ? 'anônimo' : m.uploader} · {m.fileKind}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
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
