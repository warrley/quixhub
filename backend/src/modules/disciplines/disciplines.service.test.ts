import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { makeDiscipline, makeFeedback, makeOffering, makeUser } from '../../test/factories.js';
import { db } from '../../db/client.js';
import { materials } from '../../db/schema.js';
import { createDiscipline, getDisciplineById, listDisciplines, updateDiscipline } from './disciplines.service.js';

beforeEach(resetDb);

describe('getDisciplineById', () => {
  it('returns null for an unknown id', async () => {
    expect(await getDisciplineById('does-not-exist')).toBeNull();
  });

  it('aggregates rating/responses from feedback across every offering', async () => {
    const discipline = await makeDiscipline();
    const offeringA = await makeOffering({ disciplineId: discipline.id, professor: 'A' });
    const offeringB = await makeOffering({ disciplineId: discipline.id, professor: 'B' });
    await makeFeedback({ offeringId: offeringA.id, materialQuality: 5 });
    await makeFeedback({ offeringId: offeringB.id, materialQuality: 3 });

    const row = await getDisciplineById(discipline.id);

    expect(row?.responses).toBe(2);
    expect(row?.rating).toBe(4);
  });

  it('only counts published materials', async () => {
    const discipline = await makeDiscipline();
    const uploader = await makeUser();
    await db.insert(materials).values([
      {
        disciplineId: discipline.id,
        uploaderId: uploader.id,
        type: 'prova',
        title: 'Published',
        fileKind: 'PDF',
        storageKey: 'x',
        status: 'published',
      },
      {
        disciplineId: discipline.id,
        uploaderId: uploader.id,
        type: 'prova',
        title: 'Pending',
        fileKind: 'PDF',
        storageKey: 'y',
        status: 'pending',
      },
    ]);

    const row = await getDisciplineById(discipline.id);

    expect(row?.materialsCount).toBe(1);
  });
});

describe('listDisciplines', () => {
  it('orders alphabetically by name', async () => {
    await makeDiscipline({ id: 'z', name: 'Zoologia Computacional' });
    await makeDiscipline({ id: 'a', name: 'Algoritmos' });

    const rows = await listDisciplines();

    expect(rows.map((r) => r.id)).toEqual(['a', 'z']);
  });
});

describe('createDiscipline / updateDiscipline', () => {
  it('creates and then partially updates a discipline', async () => {
    const created = await createDiscipline({
      id: 'nova-disciplina',
      code: 'QXD9999',
      name: 'Nova Disciplina',
      workload: 64,
      semester: '2026.1',
      description: '',
      prerequisites: [],
      accent: 'accent',
    });
    expect(created.name).toBe('Nova Disciplina');

    const updated = await updateDiscipline('nova-disciplina', { workload: 32 });
    expect(updated?.workload).toBe(32);
    expect(updated?.name).toBe('Nova Disciplina');
  });

  it('returns null when updating an unknown discipline', async () => {
    expect(await updateDiscipline('does-not-exist', { workload: 32 })).toBeNull();
  });
});
