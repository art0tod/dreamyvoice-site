"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const async_handler_1 = require("../utils/async-handler");
const http_error_1 = require("../utils/http-error");
const storage_1 = require("../services/storage");
const require_auth_1 = require("../middleware/require-auth");
const router = (0, express_1.Router)();
exports.mediaRouter = router;
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const bucketSchema = zod_1.z.object({
    bucket: zod_1.z.enum(['avatars', 'covers']),
});
const keyParamSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
});
function assertBucketPermissions(bucket, role) {
    if (bucket === 'covers' && role !== 'ADMIN') {
        throw new http_error_1.HttpError(403, 'Только админы могут загружать обложки');
    }
}
function parseKeyParam(req) {
    const params = req.params;
    const rawKey = params.key ?? params[0];
    const normalizedKey = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;
    return keyParamSchema.parse({ key: normalizedKey });
}
router.get('/:bucket/*key', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { bucket } = bucketSchema.parse(req.params);
    const { key } = parseKeyParam(req);
    (0, storage_1.ensureBucket)(bucket);
    const object = await (0, storage_1.getObject)(bucket, key);
    if (object.contentType) {
        res.setHeader('Content-Type', object.contentType);
    }
    if (object.contentLength !== undefined) {
        res.setHeader('Content-Length', object.contentLength);
    }
    object.body.pipe(res);
}));
router.post('/:bucket', require_auth_1.requireAuth, upload.single('file'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { bucket } = bucketSchema.parse(req.params);
    const file = req.file;
    if (!file) {
        throw new http_error_1.HttpError(400, 'Файл обязателен');
    }
    (0, storage_1.ensureBucket)(bucket);
    assertBucketPermissions(bucket, req.currentUser?.role);
    const key = req.body?.key?.trim() || (0, storage_1.makeObjectKey)(file.originalname);
    await (0, storage_1.uploadObject)({
        bucket,
        key,
        body: file.buffer,
        contentType: file.mimetype,
    });
    res.status(201).json({
        bucket,
        key,
    });
}));
router.delete('/:bucket/*key', require_auth_1.requireAuth, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { bucket } = bucketSchema.parse(req.params);
    const { key } = parseKeyParam(req);
    (0, storage_1.ensureBucket)(bucket);
    assertBucketPermissions(bucket, req.currentUser?.role);
    await (0, storage_1.deleteObject)(bucket, key);
    res.status(204).send();
}));
