import type {
  Discipline,
  DisciplineProfessorStats,
  FeedbackComment,
  Material,
  Offering,
  OfferingSearchResult,
  OfferingStats,
  OfferingWithDiscipline,
} from '@/data/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function flattenError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const firstField = Object.values(error as Record<string, unknown>)[0];
    if (Array.isArray(firstField) && typeof firstField[0] === 'string') return firstField[0];
  }
  return 'Algo deu errado.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ? flattenError(body.error) : `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  course: string | null;
  role: string;
}

export interface SubmitFeedbackInput {
  materialQuality?: number;
  examDifficulty?: number;
  workDifficulty?: number;
  attendance?: 'sempre' | 'as_vezes' | 'nao_cobra';
  groupWork?: 'frequente' | 'raro' | 'nao_tem';
  comment?: string;
}

export const api = {
  register: (data: { name: string; email: string; password: string; course?: string }) =>
    request<{ user: CurrentUser }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }).then(
      (r) => r.user,
    ),
  login: (data: { email: string; password: string }) =>
    request<{ user: CurrentUser }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.user),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: CurrentUser }>('/auth/me').then((r) => r.user),

  getDisciplines: () => request<{ disciplines: Discipline[] }>('/disciplines').then((r) => r.disciplines),
  getDiscipline: (id: string) => request<{ discipline: Discipline }>(`/disciplines/${id}`).then((r) => r.discipline),

  getMaterialsByDiscipline: (disciplineId: string) =>
    request<{ materials: Material[] }>(`/materials?disciplineId=${encodeURIComponent(disciplineId)}`).then(
      (r) => r.materials,
    ),

  getOfferingsByDiscipline: (disciplineId: string) =>
    request<{ offerings: Offering[] }>(`/offerings?disciplineId=${encodeURIComponent(disciplineId)}`).then(
      (r) => r.offerings,
    ),
  searchOfferings: (query: string) =>
    request<{ offerings: OfferingSearchResult[] }>(`/offerings/search?q=${encodeURIComponent(query)}`).then(
      (r) => r.offerings,
    ),
  getOffering: (id: string) =>
    request<{ offering: OfferingWithDiscipline }>(`/offerings/${id}`).then((r) => r.offering),

  submitFeedback: (offeringId: string, data: SubmitFeedbackInput) =>
    request<{ ok: true }>('/feedback', { method: 'POST', body: JSON.stringify({ offeringId, ...data }) }),
  getOfferingStats: (offeringId: string) =>
    request<{ stats: OfferingStats }>(`/feedback/offering/${offeringId}/stats`).then((r) => r.stats),
  getOfferingComments: (offeringId: string) =>
    request<{ comments: FeedbackComment[] }>(`/feedback/offering/${offeringId}/comments`).then((r) => r.comments),
  getDisciplineStats: (disciplineId: string) =>
    request<{ professors: DisciplineProfessorStats[] }>(`/feedback/discipline/${disciplineId}`).then(
      (r) => r.professors,
    ),
  getDisciplineStatsBulk: (disciplineIds: string[]) =>
    request<{ stats: Record<string, DisciplineProfessorStats[]> }>(
      `/feedback/discipline-stats?ids=${encodeURIComponent(disciplineIds.join(','))}`,
    ).then((r) => r.stats),
};
