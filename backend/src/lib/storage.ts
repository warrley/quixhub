import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// Local-disk storage for now (no S3/MinIO dependency) — swap this file for an
// S3-backed implementation later if/when that's actually needed; nothing
// outside this module knows how materials are stored.
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

export function buildObjectKey(disciplineId: string, fileName: string) {
  return path.posix.join('materials', disciplineId, `${randomUUID()}-${fileName}`);
}

export function resolveStoragePath(storageKey: string) {
  const resolved = path.resolve(UPLOAD_DIR, storageKey);
  if (!resolved.startsWith(UPLOAD_DIR)) throw new Error('Invalid storage key');
  return resolved;
}

export async function ensureUploadDir(storageKey: string) {
  const dir = path.dirname(resolveStoragePath(storageKey));
  await mkdir(dir, { recursive: true });
}

export { UPLOAD_DIR };
