'use client';

import { HelpCircle, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { PersonalView } from './personalColors';

interface GuideItem {
  swatch: string;
  title: string;
  detail: string;
}

interface ChartGuide {
  title: string;
  subtitle: string;
  items: GuideItem[];
  insight: string;
}

const CHART_GUIDES: Record<PersonalView, ChartGuide> = {
  treemap: {
    title: 'Como ler o Treemap 2D',
    subtitle: 'Visão proporcional dos semestres e do impacto real de cada disciplina no seu IRA.',
    items: [
      {
        swatch: 'var(--color-good)',
        title: 'Bloco verde (+Δ)',
        detail: 'Nota acima do seu IRA atual — esta matéria puxou sua média geral para cima.',
      },
      {
        swatch: 'var(--color-danger)',
        title: 'Bloco vermelho (−Δ)',
        detail:
          'Puxou seu IRA para baixo. Mesmo uma nota 8,0 fica vermelha se o seu IRA for 9,5, pois reduz a média ponderada.',
      },
      {
        swatch: 'var(--color-accent-2-dark)',
        title: 'Bloco âmbar (Previsão)',
        detail: 'Disciplina de semestre ainda em consolidação na UFC, exibida como estimativa.',
      },
      {
        swatch: 'var(--color-accent)',
        title: 'Tamanho dos blocos e cabeçalho',
        detail:
          'Em "Impacto |Δ|", blocos maiores representam matérias que mais moveram o IRA. No topo de cada caixa aparecem o semestre, o peso (1×–6×) e o saldo do período.',
      },
    ],
    insight:
      'Dica: alterne entre "Tamanho: Impacto |Δ|" e "Nota × Peso" para enxergar tanto quem mais mexeu no IRA quanto o peso bruto de cada semestre.',
  },
  ponte: {
    title: 'Como ler a Ponte dos Semestres',
    subtitle: 'Trajetória acumulada período a período, alavanca de peso e dispersão das notas.',
    items: [
      {
        swatch: 'var(--color-good)',
        title: 'Barras flutuantes (topo)',
        detail:
          'Mostram quanto cada semestre elevou (verde) ou derrubou (vermelho) seu IRA acumulado sobre a faixa Q1–Q3 real do curso.',
      },
      {
        swatch: 'var(--color-accent)',
        title: 'Pílulas centrais (1× a 6×)',
        detail:
          'Peso de recência da UFC: a partir do 6º semestre, cada hora cursada pesa 6 vezes mais no IRA do que no 1º semestre.',
      },
      {
        swatch: 'var(--color-accent-3)',
        title: 'Pontos inferiores (0–10) vs. linha do seu IRA',
        detail:
          'Cada ponto é uma matéria (tamanho = CH). Pontos acima da linha tracejada do seu IRA ajudam a subir; círculos vazados na base são trancamentos.',
      },
    ],
    insight:
      'Dica: passe o mouse sobre qualquer coluna ou ponto de nota para inspecionar a média do período e comparar com o intervalo do curso.',
  },
  bolhas: {
    title: 'Como ler o Mapa de Bolhas e Iso-Impacto',
    subtitle: 'Relação entre nota obtida, peso efetivo (CH × semestre) e força de deslocamento.',
    items: [
      {
        swatch: 'var(--color-good)',
        title: 'Quadrante superior direito (Pilares)',
        detail: 'Matérias com nota maior que seu IRA e peso alto — são a principal sustentação da sua nota.',
      },
      {
        swatch: 'var(--color-danger)',
        title: 'Quadrante superior esquerdo (Âncoras)',
        detail: 'Matérias recentes ou de alta carga horária com nota abaixo do seu IRA — têm o maior arrasto negativo.',
      },
      {
        swatch: 'var(--color-ink-2)',
        title: 'Curvas tracejadas (±0,02 / ±0,05 / ±0,10)',
        detail:
          'Mostram exatamente quanto uma nota precisa se afastar do seu IRA, em cada faixa de peso, para movê-lo naquela magnitude.',
      },
    ],
    insight:
      'Dica: filtre um semestre específico no seletor acima para isolar o efeito de um único período no seu histórico.',
  },
  balanca: {
    title: 'Como ler a Balança de Impacto',
    subtitle: 'Ranking divergente e simulador de exclusão por disciplina ou por semestre.',
    items: [
      {
        swatch: 'var(--color-danger)',
        title: 'Barras para a esquerda (−Δ)',
        detail: 'Quanto cada disciplina ou semestre reduziu o seu IRA em comparação a não tê-lo no cálculo.',
      },
      {
        swatch: 'var(--color-good)',
        title: 'Barras para a direita (+Δ)',
        detail: 'Quanto cada disciplina ou semestre elevou o seu IRA em comparação à exclusão dele.',
      },
      {
        swatch: 'var(--color-accent)',
        title: 'Botão "Simular sem"',
        detail:
          'Permite marcar uma ou várias matérias (ou semestres inteiros) para calcular na hora qual seria seu IRA sem elas.',
      },
    ],
    insight:
      'Dica: alterne para "Por semestre" para descobrir qual período inteiro mais ajudou ou prejudicou o seu histórico.',
  },
};

export function ChartGuideDialog({
  view,
  open,
  skipAuto,
  onToggleSkipAuto,
  onClose,
}: {
  view: PersonalView;
  open: boolean;
  skipAuto: boolean;
  onToggleSkipAuto: (skip: boolean) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const guide = CHART_GUIDES[view];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const onBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    dialog.addEventListener('click', onBackdropClick);
    return () => dialog.removeEventListener('click', onBackdropClick);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto p-0 max-w-none w-[min(92dvw,560px)] bg-surface-raised text-ink rounded-lg border border-line shadow-lg backdrop:bg-[oklch(15%_0.02_262/55%)] backdrop:backdrop-blur-sm open:[animation:pop_0.16s_ease]"
    >
      {open && (
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-tint text-accent-dark flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle size={17} aria-hidden="true" />
              </div>
              <div>
                <h2 id={titleId} className="font-heading font-bold text-17 text-ink">
                  {guide.title}
                </h2>
                <p className="text-xs text-ink-3 mt-0.5">{guide.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar legenda"
              className="p-1.5 rounded-full hover:bg-surface-sunken text-ink-2 hover:text-ink cursor-pointer"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {guide.items.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface-sunken border border-line px-3 py-2.5 flex items-start gap-2.5"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1"
                  style={{ background: item.swatch }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="font-heading font-bold text-xs text-ink">{item.title}</div>
                  <p className="text-11-5 text-ink-2 leading-snug mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-accent-tint/55 border border-accent/25 px-3 py-2 text-11-5 text-ink-2 leading-snug">
            {guide.insight}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <label className="inline-flex items-center gap-2 text-11-5 text-ink-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipAuto}
                onChange={(e) => onToggleSkipAuto(e.target.checked)}
                className="accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Não abrir automaticamente ao trocar de gráfico</span>
            </label>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md bg-accent text-accent-ink font-heading font-semibold text-xs cursor-pointer hover:opacity-95 transition-opacity"
            >
              Entendi, ver gráfico
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
