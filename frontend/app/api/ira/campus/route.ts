import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  buildCampusSnapshot,
  decodeRawCampusExport,
  type CampusSnapshotRequest,
  type DecodedCampusDataset,
  type RawCampusExport,
} from '@/lib/iraCampusApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedDataset: DecodedCampusDataset | null | undefined;

function loadPrivateDataset(): DecodedCampusDataset | null {
  if (cachedDataset !== undefined) return cachedDataset;

  const envPayload = process.env.IRA_CAMPUS_JSON?.trim();
  if (envPayload) {
    try {
      const jsonStr = envPayload.startsWith('{')
        ? envPayload
        : Buffer.from(envPayload, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr) as RawCampusExport;
      cachedDataset = decodeRawCampusExport(parsed);
      return cachedDataset;
    } catch {
      cachedDataset = null;
      return null;
    }
  }

  const candidates = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'src', 'data', 'iraCampus.json'),
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'frontend', 'src', 'data', 'iraCampus.json'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawCampusExport;
        cachedDataset = decodeRawCampusExport(parsed);
        return cachedDataset;
      }
    } catch {
      // keep trying fallback paths
    }
  }

  cachedDataset = null;
  return null;
}

export async function POST(request: Request) {
  const dataset = loadPrivateDataset();
  if (!dataset) {
    return NextResponse.json({ available: false });
  }

  try {
    const body = (await request.json()) as CampusSnapshotRequest;
    if (typeof body?.ira !== 'number' || !Number.isFinite(body.ira)) {
      return NextResponse.json({ error: 'Invalid IRA payload' }, { status: 400 });
    }
    const snapshot = buildCampusSnapshot(dataset, body);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
