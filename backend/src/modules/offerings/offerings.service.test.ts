import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { makeDiscipline, makeOffering } from '../../test/factories.js';
import { getById, listByDiscipline, search } from './offerings.service.js';

beforeEach(resetDb);

describe('listByDiscipline', () => {
  it('returns only offerings for the given discipline, newest semester first', async () => {
    const discipline = await makeDiscipline();
    const otherDiscipline = await makeDiscipline();
    await makeOffering({ disciplineId: discipline.id, semester: '2025.2' });
    await makeOffering({ disciplineId: discipline.id, semester: '2026.1' });
    await makeOffering({ disciplineId: otherDiscipline.id, semester: '2026.1' });

    const rows = await listByDiscipline(discipline.id);

    expect(rows).toHaveLength(2);
    expect(rows[0].semester).toBe('2026.1');
    expect(rows.every((r) => r.disciplineId === discipline.id)).toBe(true);
  });
});

describe('search', () => {
  it('matches by discipline name, case-insensitively', async () => {
    const discipline = await makeDiscipline({ name: 'Estrutura de Dados' });
    await makeOffering({ disciplineId: discipline.id, professor: 'David Sena' });

    const rows = await search('estrutura');

    expect(rows).toHaveLength(1);
    expect(rows[0].disciplineName).toBe('Estrutura de Dados');
  });

  it('matches by professor name', async () => {
    const discipline = await makeDiscipline({ name: 'Estrutura de Dados' });
    await makeOffering({ disciplineId: discipline.id, professor: 'David Sena Oliveira' });

    const rows = await search('sena');

    expect(rows).toHaveLength(1);
    expect(rows[0].professor).toBe('David Sena Oliveira');
  });

  it('an empty query lists every offering', async () => {
    const discipline = await makeDiscipline();
    await makeOffering({ disciplineId: discipline.id });
    await makeOffering({ disciplineId: discipline.id, professor: 'Someone Else' });

    const rows = await search('');

    expect(rows).toHaveLength(2);
  });
});

describe('getById', () => {
  it('includes the parent discipline', async () => {
    const discipline = await makeDiscipline({ name: 'Estrutura de Dados' });
    const offering = await makeOffering({ disciplineId: discipline.id });

    const row = await getById(offering.id);

    expect(row?.discipline.name).toBe('Estrutura de Dados');
  });

  it('returns undefined for an unknown id', async () => {
    const row = await getById('00000000-0000-0000-0000-000000000000');
    expect(row).toBeUndefined();
  });
});
