"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const require_auth_1 = require("../middleware/require-auth");
const async_handler_1 = require("../utils/async-handler");
const prisma_1 = require("../prisma");
const http_error_1 = require("../utils/http-error");
const auth_1 = require("../services/auth");
const storage_1 = require("../services/storage");
const router = (0, express_1.Router)();
exports.profileRouter = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
const allowedAvatarMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const profileUpdateSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(32)
        .optional(),
});
router.get('/', require_auth_1.requireAuth, (0, async_handler_1.asyncHandler)(async (req, res) => {
    res.json({ user: (0, auth_1.toPublicUser)(req.currentUser) });
}));
router.patch('/', require_auth_1.requireAuth, upload.single('avatar'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const user = req.currentUser;
    const { username } = profileUpdateSchema.parse(req.body);
    if (username && username !== user.username) {
        const existing = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (existing) {
            throw new http_error_1.HttpError(409, 'Никнейм уже занят');
        }
    }
    const avatarFile = req.file;
    let newAvatarKey;
    if (avatarFile) {
        if (!allowedAvatarMimeTypes.has(avatarFile.mimetype)) {
            throw new http_error_1.HttpError(400, 'Допустимы только PNG, JPEG или WEBP');
        }
        const key = (0, storage_1.makeObjectKey)(avatarFile.originalname);
        await (0, storage_1.uploadObject)({
            bucket: 'avatars',
            key,
            body: avatarFile.buffer,
            contentType: avatarFile.mimetype,
        });
        newAvatarKey = key;
        if (user.avatarKey) {
            await (0, storage_1.deleteObject)('avatars', user.avatarKey).catch(() => { });
        }
    }
    if (!username && !newAvatarKey) {
        return res.json({ user: (0, auth_1.toPublicUser)(user) });
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            username: username ?? undefined,
            avatarKey: newAvatarKey ?? undefined,
        },
    });
    res.json({ user: (0, auth_1.toPublicUser)(updatedUser) });
}));
