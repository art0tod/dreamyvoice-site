"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().url(),
    SESSION_COOKIE_NAME: zod_1.z.string().min(1),
    SESSION_COOKIE_SECRET: zod_1.z.string().min(16),
    SESSION_COOKIE_SECURE: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => (value === undefined ? undefined : value === 'true')),
    SESSION_COOKIE_SAMESITE: zod_1.z.enum(['lax', 'strict', 'none']).default('lax'),
    SESSION_TTL_HOURS: zod_1.z.coerce.number().int().positive().default(720),
    PLAYER_ALLOWED_HOSTS: zod_1.z
        .string()
        .transform((value) => value
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean))
        .refine((hosts) => hosts.length > 0, 'PLAYER_ALLOWED_HOSTS must include at least one host'),
    S3_ENDPOINT: zod_1.z.string().url(),
    S3_ACCESS_KEY: zod_1.z.string().min(1),
    S3_SECRET_KEY: zod_1.z.string().min(1),
    S3_BUCKET_AVATARS: zod_1.z.string().min(1),
    S3_BUCKET_COVERS: zod_1.z.string().min(1),
    S3_FORCE_PATH_STYLE: zod_1.z
        .enum(['true', 'false'])
        .default('true')
        .transform((value) => value === 'true'),
});
const rawEnv = envSchema.parse(process.env);
const sessionCookieSecure = rawEnv.SESSION_COOKIE_SECURE ??
    (rawEnv.NODE_ENV === 'production' ? true : false);
exports.env = {
    ...rawEnv,
    sessionCookieSecure,
    isProduction: rawEnv.NODE_ENV === 'production',
    playerAllowedHostsSet: new Set(rawEnv.PLAYER_ALLOWED_HOSTS),
    mediaBucketsSet: new Set([rawEnv.S3_BUCKET_AVATARS, rawEnv.S3_BUCKET_COVERS]),
    s3: {
        endpoint: rawEnv.S3_ENDPOINT,
        accessKeyId: rawEnv.S3_ACCESS_KEY,
        secretAccessKey: rawEnv.S3_SECRET_KEY,
        forcePathStyle: rawEnv.S3_FORCE_PATH_STYLE,
        buckets: {
            avatars: rawEnv.S3_BUCKET_AVATARS,
            covers: rawEnv.S3_BUCKET_COVERS,
        },
    },
    sessionCookieOptions: {
        httpOnly: true,
        sameSite: rawEnv.SESSION_COOKIE_SAMESITE,
        secure: sessionCookieSecure,
    },
};
