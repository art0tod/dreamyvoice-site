import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth';
import { asyncHandler } from '../utils/async-handler';
import { prisma } from '../prisma';
import { HttpError } from '../utils/http-error';
import { toPublicUser } from '../services/auth';
import { deleteObject, makeObjectKey, uploadObject } from '../services/storage';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const allowedAvatarMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const profileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .optional(),
});

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ user: toPublicUser(req.currentUser!) });
  }),
);

router.patch(
  '/',
  requireAuth,
  upload.single('avatar'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.currentUser!;
    const { username } = profileUpdateSchema.parse(req.body);

    if (username && username !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        throw new HttpError(409, 'Никнейм уже занят');
      }
    }

    const avatarFile = req.file;
    let newAvatarKey: string | undefined;

    if (avatarFile) {
      if (!allowedAvatarMimeTypes.has(avatarFile.mimetype)) {
        throw new HttpError(400, 'Допустимы только PNG, JPEG или WEBP');
      }

      const key = makeObjectKey(avatarFile.originalname);
      await uploadObject({
        bucket: 'avatars',
        key,
        body: avatarFile.buffer,
        contentType: avatarFile.mimetype,
      });
      newAvatarKey = key;

      if (user.avatarKey) {
        await deleteObject('avatars', user.avatarKey).catch(() => {});
      }
    }

    if (!username && !newAvatarKey) {
      return res.json({ user: toPublicUser(user) });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: username ?? undefined,
        avatarKey: newAvatarKey ?? undefined,
      },
    });

    res.json({ user: toPublicUser(updatedUser) });
  }),
);

export { router as profileRouter };
