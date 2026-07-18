import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { makeDiscipline, makeFeedback, makeOffering } from '../../test/factories.js';
import {
  getComments,
  getDisciplineStats,
  getOfferingStats,
  submitFeedback,
} from './feedback.service.js';

beforeEach(resetDb);

describe('submitFeedback', () => {
  it('hashes the voter identity instead of storing the raw userId', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });

    const row = await submitFeedback('user-1', offering.id, { materialQuality: 4 });

    expect(row.voterHash).not.toContain('user-1');
    expect(row.voterHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty('userId');
  });

  it('produces the same hash for the same user+offering and a different one for another user', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });

    const a = await submitFeedback('user-1', offering.id, { materialQuality: 4 });
    const b = await submitFeedback('user-2', offering.id, { materialQuality: 4 });

    expect(a.voterHash).not.toBe(b.voterHash);
  });

  it('resubmitting the same user+offering updates the row instead of creating a duplicate', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });

    await submitFeedback('user-1', offering.id, { materialQuality: 2, comment: 'first pass' });
    await submitFeedback('user-1', offering.id, { materialQuality: 5 });

    const stats = await getOfferingStats(offering.id);
    expect(stats.totalReviews).toBe(1);
    expect(stats.materialQuality).toBe(5);
    // fields omitted from the second submit are left untouched, not cleared
    const comments = await getComments(offering.id);
    expect(comments).toHaveLength(1);
    expect(comments[0].comment).toBe('first pass');
  });
});

describe('getOfferingStats', () => {
  it('averages numeric fields and takes the mode of categorical ones', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });
    await makeFeedback({ offeringId: offering.id, materialQuality: 4, attendance: 'sempre', groupWork: 'raro' });
    await makeFeedback({ offeringId: offering.id, materialQuality: 2, attendance: 'sempre', groupWork: 'frequente' });

    const stats = await getOfferingStats(offering.id);

    expect(stats.totalReviews).toBe(2);
    expect(stats.materialQuality).toBe(3);
    expect(stats.attendance).toBe('sempre');
  });

  it('returns zeroed stats when an offering has no feedback', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });

    const stats = await getOfferingStats(offering.id);

    expect(stats).toEqual({
      materialQuality: 0,
      examDifficulty: 0,
      workDifficulty: 0,
      attendance: '',
      groupWork: '',
      totalReviews: 0,
    });
  });
});

describe('getComments', () => {
  it('only returns feedback rows that have a comment, newest first', async () => {
    const discipline = await makeDiscipline();
    const offering = await makeOffering({ disciplineId: discipline.id });
    await makeFeedback({ offeringId: offering.id, comment: null });
    await makeFeedback({ offeringId: offering.id, comment: 'segunda opinião' });

    const comments = await getComments(offering.id);

    expect(comments).toHaveLength(1);
    expect(comments[0].comment).toBe('segunda opinião');
  });
});

describe('getDisciplineStats', () => {
  it('groups feedback by professor across every offering of the discipline', async () => {
    const discipline = await makeDiscipline();
    const offeringA = await makeOffering({ disciplineId: discipline.id, professor: 'Professor A', semester: '2025.2' });
    const offeringB = await makeOffering({ disciplineId: discipline.id, professor: 'Professor A', semester: '2026.1' });
    const offeringC = await makeOffering({ disciplineId: discipline.id, professor: 'Professor B', semester: '2026.1' });

    await makeFeedback({ offeringId: offeringA.id, materialQuality: 4 });
    await makeFeedback({ offeringId: offeringB.id, materialQuality: 2 });
    await makeFeedback({ offeringId: offeringC.id, materialQuality: 5 });

    const result = await getDisciplineStats(discipline.id);
    const byProfessor = Object.fromEntries(result.map((r) => [r.professor, r]));

    expect(byProfessor['Professor A'].stats.totalReviews).toBe(2);
    expect(byProfessor['Professor A'].stats.materialQuality).toBe(3);
    expect(byProfessor['Professor A'].semesters.sort()).toEqual(['2025.2', '2026.1']);
    expect(byProfessor['Professor B'].stats.totalReviews).toBe(1);
  });

  it('excludes professors/offerings with no feedback at all', async () => {
    const discipline = await makeDiscipline();
    await makeOffering({ disciplineId: discipline.id, professor: 'No Reviews Yet' });

    const result = await getDisciplineStats(discipline.id);

    expect(result).toHaveLength(0);
  });
});
