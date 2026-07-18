import { readFile } from 'node:fs/promises';
import 'dotenv/config';
import { db } from './client.js';
import { disciplines, offerings } from './schema.js';

// Real SIGAA 2026.1 catalog (104 disciplines, 134 offerings), cleaned from
// the raw SIGAA export by hand — see backend/src/db/data/sigaa-2026-1.json.
const dataPath = new URL('./data/sigaa-2026-1.json', import.meta.url);
const { disciplines: CATALOG, offerings: OFFERINGS } = JSON.parse(await readFile(dataPath, 'utf-8'));

await db.insert(disciplines).values(CATALOG).onConflictDoNothing({ target: disciplines.id });
console.log(`Seeded ${CATALOG.length} disciplines (existing rows left untouched).`);

await db
  .insert(offerings)
  .values(OFFERINGS)
  .onConflictDoNothing({ target: [offerings.disciplineId, offerings.professor, offerings.semester] });
console.log(`Seeded ${OFFERINGS.length} offerings (existing rows left untouched).`);

process.exit(0);
