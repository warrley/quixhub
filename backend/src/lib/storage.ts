import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is not set — copy .env.example to .env first.`);
}

const bucket = process.env.S3_BUCKET!;

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // required for MinIO
});

export function buildObjectKey(disciplineId: string, fileName: string) {
  return `materials/${disciplineId}/${randomUUID()}-${fileName}`;
}

export async function presignUpload(storageKey: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: storageKey, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export async function presignDownload(storageKey: string) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
