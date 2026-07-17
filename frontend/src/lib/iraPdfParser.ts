import type { IraEntry } from '@/data/types';

export interface ParsedHistorico {
  entries: Omit<IraEntry, 'id'>[];
  printedIra?: number;
}

const ROW_RE =
  /^(\d{4}\.\d)\s+(?:([#*e&@§])\s+)?([A-Z]{2,5}\d{3,4})\s+([\d.,]+)\s+(\S+)\s+([\d.,]+|--)\s+([\d.,]+|--)\s+(APROVADO|REPROVADO|TRANCAD[OA]|EM ANDAMENTO)/;

const SECTION_START = 'Componentes Curriculares Cursados/Cursando';
const SECTION_END = 'Componentes Curriculares Obrigatórios Pendentes';

function toNumber(raw: string): number | undefined {
  if (raw === '--') return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function situacaoFromSituacao(situacao: string, nota: number | undefined): IraEntry['situacao'] {
  if (nota === undefined) return 'em_andamento';
  if (situacao === 'APROVADO') return 'aprovado';
  if (situacao === 'REPROVADO') return 'reprovado';
  return 'outro';
}

/**
 * Reconstructs visual lines from pdf.js text items by clustering items that
 * share a y-coordinate, then sorting each cluster left-to-right.
 */
function reconstructLines(items: { str: string; transform: number[] }[]): string[] {
  const rows = new Map<number, [number, string][]>();
  for (const item of items) {
    if (!item.str || item.str.trim() === '') continue;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push([x, item.str]);
  }
  const ys = [...rows.keys()].sort((a, b) => b - a);
  return ys.map((y) =>
    rows
      .get(y)!
      .sort((a, b) => a[0] - b[0])
      .map(([, s]) => s)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Parses a UFC SIGAA "Histórico Escolar" PDF into IRA entries. Client-only —
 * callers must dynamic-import this module from an event handler, never at
 * module top level, so pdfjs-dist is never pulled into the SSR bundle.
 */
export async function parseHistoricoPdf(file: File): Promise<ParsedHistorico> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise;

  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    lines.push(...reconstructLines(content.items as { str: string; transform: number[] }[]));
  }

  let printedIra: number | undefined;
  const entries: Omit<IraEntry, 'id'>[] = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (printedIra === undefined) {
      const iraMatch = line.match(/IRA\s*-\s*Individual:\s*([\d.,]+)/);
      if (iraMatch) printedIra = toNumber(iraMatch[1]);
    }

    if (!inSection) {
      if (line.includes(SECTION_START)) inSection = true;
      continue;
    }
    if (line.includes(SECTION_END)) break;

    const match = line.match(ROW_RE);
    if (!match) continue;

    const [, period, , , ch, , , notaRaw, situacao] = match;
    const nota = toNumber(notaRaw);
    const workload = toNumber(ch) ?? 0;
    const disciplineName = (lines[i - 1] ?? '').trim();
    if (!disciplineName) continue;

    entries.push({
      disciplineName,
      grade: nota ?? 0,
      workload,
      situacao: situacaoFromSituacao(situacao, nota),
      source: 'pdf',
      semester: period,
    });
  }

  return { entries, printedIra };
}
