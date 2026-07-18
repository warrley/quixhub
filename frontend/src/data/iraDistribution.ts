// Assumed IRA distribution per program, used to plot a student's IRA
// against a course's curve. Keyed by course name — matches
// `currentUser.course` (so the student's own course is preselected) and
// the cadastro page's course options, though the IRA page lets students
// pick any course here to compare against, not just their own.
// `mean`/`std` are null for courses we don't have distribution data for
// yet ("Outro / Não sei") — the comparison chart is skipped in that case
// rather than guessing.
export const IRA_DISTRIBUTIONS: Record<string, { mean: number | null; std: number | null; students?: number }> = {
  'Engenharia de Software': { mean: 7.75713015, std: 1.67180061, students: 268 },
  'Ciência da Computação': { mean: 7.06818247, std: 1.6854862, students: 254 },
  'Sistemas de Informação': { mean: 7.22044086, std: 1.78380585, students: 250 },
  'Engenharia da Computação': { mean: 6.2446, std: 2.0459, students: 203 },
  'Redes de Computadores': { mean: 6.31597328, std: 2.03052092, students: 155 },
  'Design Digital': { mean: 8.37783527, std: 1.23697138, students: 247 },
  'Outro / Não sei': { mean: null, std: null },
};

// Data da extração dos alunos ativos via planilha da graduação
export const IRA_DATA_UPDATED_AT = '23/07/2025';
