"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBucket = ensureBucket;
exports.resolveBucket = resolveBucket;
exports.makeObjectKey = makeObjectKey;
exports.uploadObject = uploadObject;
exports.deleteObject = deleteObject;
exports.getObject = getObject;
const crypto_1 = require("crypto");
const stream_1 = require("stream");
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../env");
const http_error_1 = require("../utils/http-error");
const client = new client_s3_1.S3Client({
    region: 'us-east-1',
    endpoint: env_1.env.s3.endpoint,
    credentials: {
        accessKeyId: env_1.env.s3.accessKeyId,
        secretAccessKey: env_1.env.s3.secretAccessKey,
    },
    forcePathStyle: env_1.env.s3.forcePathStyle,
});
const bucketMap = {
    avatars: env_1.env.s3.buckets.avatars,
    covers: env_1.env.s3.buckets.covers,
};
function ensureBucket(bucket) {
    const key = bucket;
    if (!bucketMap[key]) {
        throw new http_error_1.HttpError(404, 'Bucket not found');
    }
    return key;
}
function resolveBucket(bucket) {
    return bucketMap[bucket];
}
function makeObjectKey(originalName) {
    if (!originalName) {
        return (0, crypto_1.randomUUID)();
    }
    const sanitized = originalName.trim().replace(/[^\w.\-]+/g, '-');
    return `${(0, crypto_1.randomUUID)()}-${sanitized}`.replace(/-+/g, '-');
}
async function uploadObject(options) {
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: resolveBucket(options.bucket),
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
    }));
}
async function deleteObject(bucket, key) {
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: resolveBucket(bucket),
        Key: key,
    }));
}
async function getObject(bucket, key) {
    try {
        const [metadata, object] = await Promise.all([
            client.send(new client_s3_1.HeadObjectCommand({
                Bucket: resolveBucket(bucket),
                Key: key,
            })),
            client.send(new client_s3_1.GetObjectCommand({
                Bucket: resolveBucket(bucket),
                Key: key,
            })),
        ]);
        const stream = toReadable(object.Body);
        if (!stream) {
            throw new http_error_1.HttpError(404, 'File is not readable');
        }
        return {
            body: stream,
            contentType: metadata.ContentType ?? undefined,
            contentLength: metadata.ContentLength ?? undefined,
        };
    }
    catch (error) {
        if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
            throw new http_error_1.HttpError(404, 'File not found');
        }
        throw error;
    }
}
function toReadable(body) {
    if (!body) {
        return undefined;
    }
    if (body instanceof stream_1.Readable) {
        return body;
    }
    if (body instanceof Uint8Array || typeof body === 'string') {
        return stream_1.Readable.from(body);
    }
    if (typeof body[Symbol.asyncIterator] === 'function') {
        return stream_1.Readable.from(body);
    }
    if (typeof body[Symbol.iterator] === 'function') {
        return stream_1.Readable.from(body);
    }
    return undefined;
}
