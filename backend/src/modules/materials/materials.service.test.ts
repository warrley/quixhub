import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { makeDiscipline, makeUser } from '../../test/factories.js';
import {
  createMaterial,
  getMaterialById,
  listPending,
  listPublishedByDiscipline,
  markHelpful,
  setMaterialStatus,
} from './materials.service.js';

beforeEach(resetDb);

async function makeMaterial(overrides: Partial<Parameters<typeof createMaterial>[0]> = {}) {
  const discipline = overrides.disciplineId ? null : await makeDiscipline();
  const uploader = overrides.uploaderId ? null : await makeUser();
  return createMaterial({
    disciplineId: overrides.disciplineId ?? discipline!.id,
    uploaderId: overrides.uploaderId ?? uploader!.id,
    type: overrides.type ?? 'prova',
    title: overrides.title ?? 'Prova 1',
    fileKind: overrides.fileKind ?? 'PDF',
    storageKey: overrides.storageKey ?? 'some/key.pdf',
    anonymous: overrides.anonymous ?? true,
    status: overrides.status ?? 'pending',
  });
}

describe('listPublishedByDiscipline', () => {
  it('only returns published materials for that discipline', async () => {
    const discipline = await makeDiscipline();
    await makeMaterial({ disciplineId: discipline.id, status: 'published', title: 'Published' });
    await makeMaterial({ disciplineId: discipline.id, status: 'pending', title: 'Pending' });
    await makeMaterial({ status: 'published', title: 'Other discipline' });

    const rows = await listPublishedByDiscipline(discipline.id);

    expect(rows.map((r) => r.title)).toEqual(['Published']);
  });

  it('hides the uploader name when anonymous', async () => {
    const discipline = await makeDiscipline();
    const uploader = await makeUser({ name: 'Maria' });
    await makeMaterial({ disciplineId: discipline.id, uploaderId: uploader.id, status: 'published', anonymous: true });
    await makeMaterial({ disciplineId: discipline.id, uploaderId: uploader.id, status: 'published', anonymous: false });

    const rows = await listPublishedByDiscipline(discipline.id);
    const anon = rows.find((r) => r.anonymous);
    const named = rows.find((r) => !r.anonymous);

    expect(anon?.uploader).toBeUndefined();
    expect(named?.uploader).toBe('Maria');
  });
});

describe('listPending', () => {
  it('only returns pending materials, oldest first', async () => {
    await makeMaterial({ status: 'published' });
    const pending = await makeMaterial({ status: 'pending' });

    const rows = await listPending();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(pending.id);
  });
});

describe('setMaterialStatus', () => {
  it('updates status and returns null for an unknown id', async () => {
    const material = await makeMaterial({ status: 'pending' });

    const approved = await setMaterialStatus(material.id, 'published');
    expect(approved?.status).toBe('published');

    expect(await setMaterialStatus('00000000-0000-0000-0000-000000000000', 'published')).toBeNull();
  });
});

describe('markHelpful', () => {
  it('is idempotent per user — voting twice still counts once', async () => {
    const material = await makeMaterial({ status: 'published' });
    const user = await makeUser();

    await markHelpful(material.id, user.id);
    await markHelpful(material.id, user.id);

    const discipline = await getMaterialById(material.id);
    const [row] = await listPublishedByDiscipline(discipline!.disciplineId);
    expect(row.helpfulCount).toBe(1);
  });
});
