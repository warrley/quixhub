'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { LogOut, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { currentUser, disciplines } from '@/data/mock';

const ACCENT_DOT: Record<string, string> = {
  accent: 'var(--color-accent)',
  accent2: 'var(--color-accent-2)',
  accent3: 'var(--color-accent-3)',
  accent4: 'var(--color-accent-4)',
};

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      className={`w-[42px] h-6 rounded-full relative cursor-pointer shrink-0 transition-[background-color] duration-200 ease-out ${on ? 'bg-accent' : 'bg-line'}`}
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      tabIndex={0}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${on ? 'translate-x-[18px]' : ''}`}
      />
    </div>
  );
}

export default function Profile() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const router = useRouter();
  const [trackedIds, setTrackedIds] = useState(new Set(disciplines.filter((d) => d.tracked).map((d) => d.id)));
  const [notifs, setNotifs] = useState({ emailDeadlines: true, pushDeadlines: true, weeklyDigest: false });

  const tracked = disciplines.filter((d) => trackedIds.has(d.id));

  return (
    <div>
      <div className="flex items-center gap-4 my-2 mb-8">
        <Avatar name={currentUser.name} size="lg" />
        <div>
          <div className="font-heading font-bold text-xl">{currentUser.name}</div>
          <div className="text-13 text-ink-2">{currentUser.email}</div>
          <div className="text-13 text-ink-2">{currentUser.course}</div>
        </div>
      </div>

      <div className="mb-8 max-w-[560px]">
        <div className="font-heading font-bold text-14-5 mb-3">Disciplinas acompanhadas</div>
        {tracked.length === 0 && (
          <p className="text-13 text-ink-2">
            Nenhuma disciplina acompanhada. <Link href="/catalogo">Explorar catálogo</Link>
          </p>
        )}
        {tracked.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 py-3 px-3.5 border border-line rounded-md bg-surface mb-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCENT_DOT[d.accent] }} />
            <span className="font-semibold text-13 flex-1">{d.name}</span>
            <button
              style={{ all: 'unset', cursor: 'pointer', color: 'var(--color-ink-3)', display: 'flex' }}
              onClick={() =>
                setTrackedIds((cur) => {
                  const next = new Set(cur);
                  next.delete(d.id);
                  return next;
                })
              }
              aria-label={`Deixar de acompanhar ${d.name}`}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mb-8 max-w-[560px]">
        <div className="font-heading font-bold text-14-5 mb-3">Notificações</div>
        <div className="flex items-center justify-between py-3 border-b border-line last:border-b-0">
          <div>
            <div className="text-13-5 font-medium">E-mail para prazos</div>
            <div className="text-11-5 text-ink-3 mt-0.5">Receba um lembrete por e-mail próximo dos prazos.</div>
          </div>
          <Switch on={notifs.emailDeadlines} onToggle={() => setNotifs((n) => ({ ...n, emailDeadlines: !n.emailDeadlines }))} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-line last:border-b-0">
          <div>
            <div className="text-13-5 font-medium">Push para prazos</div>
            <div className="text-11-5 text-ink-3 mt-0.5">Notificação no navegador/app.</div>
          </div>
          <Switch on={notifs.pushDeadlines} onToggle={() => setNotifs((n) => ({ ...n, pushDeadlines: !n.pushDeadlines }))} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-line last:border-b-0">
          <div>
            <div className="text-13-5 font-medium">Resumo semanal</div>
            <div className="text-11-5 text-ink-3 mt-0.5">Novos materiais e feedback da semana.</div>
          </div>
          <Switch on={notifs.weeklyDigest} onToggle={() => setNotifs((n) => ({ ...n, weeklyDigest: !n.weeklyDigest }))} />
        </div>
      </div>

      <div className="mb-8 max-w-[560px]">
        <div className="font-heading font-bold text-14-5 mb-3">Conta</div>
        <Button variant="ghost" className="text-danger" onClick={() => router.push('/login')}>
          <LogOut size={16} /> Sair da conta
        </Button>
      </div>
    </div>
  );
}
