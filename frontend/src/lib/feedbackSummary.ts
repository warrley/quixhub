import type { DisciplineProfessorStats } from '@/data/types';

// Deliberately no aggregated "professor rating" number — see docs/vision.md
// → Resolved decisions. Just a plain-language read of the structured topics.
export function summarizeProfessor(stats: DisciplineProfessorStats['stats']) {
  const parts: string[] = [];
  if (stats.materialQuality > 0) {
    parts.push(stats.materialQuality >= 4 ? 'material bom' : stats.materialQuality <= 2 ? 'material fraco' : 'material mediano');
  }
  if (stats.examDifficulty > 0) {
    parts.push(stats.examDifficulty >= 4 ? 'provas difíceis' : stats.examDifficulty <= 2 ? 'provas tranquilas' : 'provas medianas');
  }
  if (stats.workDifficulty > 0) {
    parts.push(stats.workDifficulty >= 4 ? 'trabalhos pesados' : stats.workDifficulty <= 2 ? 'trabalhos leves' : 'trabalhos moderados');
  }
  if (parts.length === 0) return '';
  return parts.join(', ').replace(/^./, (c) => c.toUpperCase());
}
