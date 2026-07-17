export interface Discipline {
  id: string;
  code: string;
  name: string;
  professor: string;
  workload: number;
  semester: string;
  description: string;
  prerequisites: string[];
  materialsCount: number;
  ratingLevel: 1 | 2 | 3 | 4 | 5;
  rating: number;
  responses: number;
  tracked: boolean;
  accent: 'accent' | 'accent2' | 'accent3' | 'accent4';
}

export type MaterialType = 'prova' | 'resumo' | 'codigo' | 'trabalho';

export interface Material {
  id: string;
  disciplineId: string;
  type: MaterialType;
  title: string;
  fileKind: string;
  helpfulCount: number;
  addedAt: string;
  anonymous: boolean;
  uploader?: string;
  status: 'published' | 'pending' | 'rejected';
}

export interface CalendarEvent {
  id: string;
  disciplineId: string;
  title: string;
  date: string;
  kind: 'prova' | 'entrega' | 'seminario';
  confirmations: number;
  confirmed: boolean;
  linkedMaterialId?: string;
}

export interface FeedbackStat {
  label: string;
  value: string;
  percent: number;
  tone: string;
}

export interface IraEntry {
  id: string;
  disciplineName: string;
  disciplineId?: string;
  grade: number;
  workload: number;
  situacao?: 'aprovado' | 'reprovado' | 'em_andamento' | 'trancado' | 'outro';
  source: 'manual' | 'pdf';
  /** Academic period the discipline was taken in (e.g. "2025.1" from a PDF
   * import, or the catalog's semester label for a manual entry). Entries
   * without one are grouped under "Outros" in the UI. */
  semester?: string;
}

export interface IraState {
  entries: IraEntry[];
  updatedAt: string;
}

export interface FluxogramaNode {
  id: string;
  kind: 'catalog' | 'custom';
  disciplineId?: string;
  label: string;
  position: { x: number; y: number };
}

export interface FluxogramaEdge {
  id: string;
  source: string;
  target: string;
  origin: 'catalog' | 'manual';
}

export interface FluxogramaState {
  nodes: FluxogramaNode[];
  edges: FluxogramaEdge[];
  updatedAt: string;
}
