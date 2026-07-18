import type {
  Discipline,
  DisciplineProfessorStats,
  FeedbackComment,
  Offering,
  OfferingSearchResult,
  OfferingStats,
  OfferingWithDiscipline,
} from '@/data/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  return res.json();
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
  getDisciplines: () => request<{ disciplines: Discipline[] }>('/disciplines').then((r) => r.disciplines),
  getDiscipline: (id: string) => request<{ discipline: Discipline }>(`/disciplines/${id}`).then((r) => r.discipline),

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
};
