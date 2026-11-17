'use client';

import { EyeOff, FileText, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';

/**
 * First-visit reassurance modal for /ira: blurs the page behind it and
 * explains clearly that grades stay only in the browser's localStorage
 * unless the student explicitly chooses to share their name in the ranking.
 */
export function IraPrivacyModal({ open, onAccept }: { open: boolean; onAccept: () => void }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-[oklch(15%_0.02_262/55%)] backdrop-blur-md flex items-center justify-center p-4 z-[100] [animation:fadeIn_0.15s_ease]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ira-privacy-title"
    >
      <div className="w-full max-w-[460px] bg-surface-raised rounded-lg border border-line shadow-lg p-6 [animation:pop_0.18s_ease]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-good-tint flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-good" aria-hidden />
          </div>
          <div>
            <h2 id="ira-privacy-title" className="font-heading font-bold text-17 text-ink leading-tight">
              Suas notas ficam só com você
            </h2>
            <p className="text-12 text-ink-3">Privacidade em primeiro lugar na calculadora de IRA</p>
          </div>
        </div>

        <ul className="flex flex-col gap-3 my-4 text-13 text-ink-2 leading-relaxed">
          <li className="flex items-start gap-2.5">
            <Lock size={16} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <span>
              <b className="text-ink">100% no seu navegador:</b> suas disciplinas, notas e IRA ficam salvos apenas no{' '}
              <code className="text-12 bg-surface-sunken px-1 py-0.5 rounded">localStorage</code> deste dispositivo — nada é enviado
              para o nosso servidor.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <FileText size={16} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <span>
              <b className="text-ink">PDF lido localmente:</b> ao importar seu histórico escolar do SIGAA, o arquivo é processado aqui
              mesmo no navegador, sem upload.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <EyeOff size={16} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <span>
              <b className="text-ink">Você no controle:</b> gráficos e ranking são anônimos. Você só compartilha seu nome se confirmar
              sua nota e marcar explicitamente que deseja aparecer.
            </span>
          </li>
        </ul>

        <div className="flex justify-end pt-2">
          <Button onClick={onAccept} block>
            Entendi, continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
