import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { env } from '../env';
import { HttpError } from '../utils/http-error';

const client = new S3Client({
  region: 'us-east-1',
  endpoint: env.s3.endpoint,
  credentials: {
    accessKeyId: env.s3.accessKeyId,
    secretAccessKey: env.s3.secretAccessKey,
  },
  forcePathStyle: env.s3.forcePathStyle,
});

const bucketMap = {
  avatars: env.s3.buckets.avatars,
  covers: env.s3.buckets.covers,
} as const;

export type MediaBucket = keyof typeof bucketMap;

export function ensureBucket(bucket: string): MediaBucket {
  const key = bucket as MediaBucket;
  if (!bucketMap[key]) {
    throw new HttpError(404, 'Bucket not found');
  }
  return key;
}

export function resolveBucket(bucket: MediaBucket) {
  return bucketMap[bucket];
}

export function makeObjectKey(originalName?: string | null) {
  if (!originalName) {
    return randomUUID();
  }

  const sanitized = originalName.trim().replace(/[^\w.\-]+/g, '-');
  return `${randomUUID()}-${sanitized}`.replace(/-+/g, '-');
}

export async function uploadObject(options: {
  bucket: MediaBucket;
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  await client.send(
    new PutObjectCommand({
      Bucket: resolveBucket(options.bucket),
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
}

export async function deleteObject(bucket: MediaBucket, key: string) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: resolveBucket(bucket),
      Key: key,
    }),
  );
}

export type MediaObject = {
  body: Readable;
  contentType?: string;
  contentLength?: number;
};

export async function getObject(bucket: MediaBucket, key: string): Promise<MediaObject> {
  try {
    const [metadata, object] = await Promise.all([
      client.send(
        new HeadObjectCommand({
          Bucket: resolveBucket(bucket),
          Key: key,
        }),
      ),
      client.send(
        new GetObjectCommand({
          Bucket: resolveBucket(bucket),
          Key: key,
        }),
      ),
    ]);

    const stream = toReadable(object.Body);
    if (!stream) {
      throw new HttpError(404, 'File is not readable');
    }

    return {
      body: stream,
      contentType: metadata.ContentType ?? undefined,
      contentLength: metadata.ContentLength ?? undefined,
    };
  } catch (error) {
    if ((error as Error)?.name === 'NotFound' || (error as any)?.$metadata?.httpStatusCode === 404) {
      throw new HttpError(404, 'File not found');
    }

    throw error;
  }
}

function toReadable(body: GetObjectCommandOutput['Body']): Readable | undefined {
  if (!body) {
    return undefined;
  }

  if (body instanceof Readable) {
    return body;
  }

  if (body instanceof Uint8Array || typeof body === 'string') {
    return Readable.from(body);
  }

  if (typeof (body as any)[Symbol.asyncIterator] === 'function') {
    return Readable.from(body as unknown as AsyncIterable<unknown>);
  }

  if (typeof (body as any)[Symbol.iterator] === 'function') {
    return Readable.from(body as unknown as Iterable<unknown>);
  }

  return undefined;
}
