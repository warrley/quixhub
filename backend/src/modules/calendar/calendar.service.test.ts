import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { makeDiscipline, makeUser } from '../../test/factories.js';
import { createEvent, listEvents, setConfirmation } from './calendar.service.js';

beforeEach(resetDb);

describe('listEvents', () => {
  it('only returns events within the [from, to) range', async () => {
    const discipline = await makeDiscipline();
    const user = await makeUser();
    await createEvent({ disciplineId: discipline.id, title: 'Inside', date: '2026-07-20', kind: 'prova', createdById: user.id });
    await createEvent({ disciplineId: discipline.id, title: 'Outside', date: '2026-08-01', kind: 'prova', createdById: user.id });

    const rows = await listEvents({ from: '2026-07-01', to: '2026-08-01' });

    expect(rows.map((r) => r.title)).toEqual(['Inside']);
  });

  it('reports confirmed only for the requesting user', async () => {
    const discipline = await makeDiscipline();
    const user = await makeUser();
    const otherUser = await makeUser();
    const event = await createEvent({ disciplineId: discipline.id, title: 'Prova', date: '2026-07-20', kind: 'prova', createdById: user.id });
    await setConfirmation(event.id, user.id, true);

    const [asUser] = await listEvents({ from: '2026-07-01', to: '2026-08-01' }, user.id);
    const [asOther] = await listEvents({ from: '2026-07-01', to: '2026-08-01' }, otherUser.id);

    expect(asUser.confirmed).toBe(true);
    expect(asUser.confirmations).toBe(1);
    expect(asOther.confirmed).toBe(false);
    expect(asOther.confirmations).toBe(1);
  });
});

describe('setConfirmation', () => {
  it('is idempotent when confirming twice and removes the row when unconfirmed', async () => {
    const discipline = await makeDiscipline();
    const user = await makeUser();
    const event = await createEvent({ disciplineId: discipline.id, title: 'Prova', date: '2026-07-20', kind: 'prova', createdById: user.id });

    await setConfirmation(event.id, user.id, true);
    await setConfirmation(event.id, user.id, true);
    let [row] = await listEvents({ from: '2026-07-01', to: '2026-08-01' }, user.id);
    expect(row.confirmations).toBe(1);

    await setConfirmation(event.id, user.id, false);
    [row] = await listEvents({ from: '2026-07-01', to: '2026-08-01' }, user.id);
    expect(row.confirmations).toBe(0);
    expect(row.confirmed).toBe(false);
  });
});
