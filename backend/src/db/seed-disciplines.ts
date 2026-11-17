import { readdir, readFile } from 'node:fs/promises';
import 'dotenv/config';
import { db } from './client.js';
import { disciplines, offerings } from './schema.js';

type Catalog = {
  disciplines: (typeof disciplines.$inferInsert)[];
  offerings: (typeof offerings.$inferInsert)[];
};

// Real SIGAA catalog, one file per semester (data/sigaa-AAAA-S.json), each
// extracted from the "Consulta Geral de Turmas" export and reviewed by hand.
// Files are read newest-first: `disciplines.semester` is a single column and
// the insert keeps whichever row it sees first for an id, so on a fresh
// database it records the most recent semester the discipline was offered.
const dataDir = new URL('./data/', import.meta.url);
const files = (await readdir(dataDir))
  .filter((f) => /^sigaa-\d{4}-\d\.json$/.test(f))
  .sort()
  .reverse();
const catalogs: Catalog[] = await Promise.all(
  files.map(async (f) => JSON.parse(await readFile(new URL(f, dataDir), 'utf-8'))),
);

const catalog = new Map<string, Catalog['disciplines'][number]>();
for (const c of catalogs) for (const d of c.disciplines) if (!catalog.has(d.id)) catalog.set(d.id, d);
const allOfferings = catalogs.flatMap((c) => c.offerings);

console.log(`Reading ${files.join(', ')}`);

const insertedDisciplines = await db
  .insert(disciplines)
  .values([...catalog.values()])
  .onConflictDoNothing({ target: disciplines.id })
  .returning({ id: disciplines.id });
console.log(
  `Disciplines: ${insertedDisciplines.length} inserted, ${catalog.size - insertedDisciplines.length} already existed.`,
);

const insertedOfferings = await db
  .insert(offerings)
  .values(allOfferings)
  .onConflictDoNothing({ target: [offerings.disciplineId, offerings.professor, offerings.semester] })
  .returning({ id: offerings.id });
console.log(
  `Offerings: ${insertedOfferings.length} inserted, ${allOfferings.length - insertedOfferings.length} already existed.`,
);

process.exit(0);
