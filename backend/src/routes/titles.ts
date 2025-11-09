import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import type { Episode as EpisodeModel } from '@prisma/client';
import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';
import { requireAuth } from '../middleware/require-auth';
import { requireAdmin } from '../middleware/require-admin';

type TitleWithEpisodes = Prisma.TitleGetPayload<{ include: { episodes: true } }>;
type CommentWithUser = Prisma.CommentGetPayload<{ include: { user: true } }>;

const router = Router();
const commentsRouter = Router({ mergeParams: true });
const episodesRouter = Router({ mergeParams: true });

const titleQuerySchema = z.object({
  includeDrafts: z
    .union([z.literal('1'), z.literal('0')])
    .optional()
    .transform((value) => value === '1'),
});

const titleCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только латинские буквы, цифры и дефис'),
  name: z
    .string()
    .trim()
    .min(3)
    .max(128),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((value) => value || undefined),
  coverKey: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => value || undefined),
  published: z.boolean().optional().default(false),
});

const titleUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(128)
    .optional(),
  description: z
    .union([z.string().trim().max(5000), z.null()])
    .optional(),
  coverKey: z
    .union([z.string().trim().max(255), z.null()])
    .optional(),
  published: z.boolean().optional(),
});

const episodeCreateSchema = z.object({
  number: z.coerce.number().int().positive().max(10000),
  name: z
    .string()
    .trim()
    .min(3)
    .max(128),
  playerSrc: z.string().url(),
  durationMinutes: z
    .union([z.coerce.number().int().positive().max(2000), z.literal(null)])
    .optional(),
  published: z.boolean().optional().default(false),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = titleQuerySchema.parse(req.query);
    const canSeeDrafts = query.includeDrafts && req.currentUser?.role === 'ADMIN';

    const titles = await prisma.title.findMany({
      where: canSeeDrafts
        ? {}
        : {
            published: true,
          },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        episodes: {
          where: canSeeDrafts
            ? {}
            : {
                published: true,
              },
          orderBy: {
            number: 'asc',
          },
        },
      },
    });

    res.json({ titles: titles.map(toTitleDto(canSeeDrafts)) });
  }),
);

const slugSchema = z.object({ slug: z.string().min(1).transform((value) => value.trim()) });

router.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = slugSchema.parse(req.params);
    const includeDrafts = req.currentUser?.role === 'ADMIN';
    const title = await prisma.title.findFirst({
      where: buildSlugWhere(slug),
      include: {
        episodes: {
          where: includeDrafts
            ? {}
            : {
                published: true,
              },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!title || (!title.published && !includeDrafts)) {
      throw new HttpError(404, 'Title not found');
    }

    res.json({ title: toTitleDto(includeDrafts)(title) });
  }),
);

const commentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(3, 'Комментарий слишком короткий')
    .max(2000, 'Комментарий слишком длинный'),
});

commentsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = slugSchema.parse(req.params);
    const includeModeration = req.currentUser?.role === 'ADMIN';
    const title = await prisma.title.findFirst({ where: buildSlugWhere(slug) });

    if (!title || (!title.published && !includeModeration)) {
      throw new HttpError(404, 'Title not found');
    }

    const comments = await prisma.comment.findMany({
      where: {
        titleId: title.id,
        ...(includeModeration ? {} : { status: 'APPROVED' }),
      },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });

    res.json({ comments: comments.map(toCommentDto(includeModeration)) });
  }),
);

commentsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = slugSchema.parse(req.params);
    const { body } = commentBodySchema.parse(req.body);
    const user = req.currentUser!;
    const title = await prisma.title.findFirst({ where: buildSlugWhere(slug) });

    if (!title || (!title.published && user.role !== 'ADMIN')) {
      throw new HttpError(404, 'Title not found');
    }

    const comment = await prisma.comment.create({
      data: {
        titleId: title.id,
        userId: user.id,
        body,
        status: user.role === 'ADMIN' ? 'APPROVED' : undefined,
      },
      include: { user: true },
    });

    res.status(201).json({ comment: toCommentDto(user.role === 'ADMIN')(comment) });
  }),
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const data = titleCreateSchema.parse(req.body);

    try {
      const title = await prisma.title.create({
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          coverKey: data.coverKey ?? null,
          published: data.published ?? false,
        },
        include: { episodes: true },
      });

      res.status(201).json({ title: toTitleDto(true)(title) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Тайтл с таким slug уже существует');
      }

      throw error;
    }
  }),
);

router.patch(
  '/:slug',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = slugSchema.parse(req.params);
    const updates = titleUpdateSchema.parse(req.body);

    if (!Object.values(updates).some((value) => value !== undefined)) {
      throw new HttpError(400, 'Нет изменений для сохранения');
    }

    const existing = await prisma.title.findFirst({
      where: buildSlugWhere(slug),
    });

    if (!existing) {
      throw new HttpError(404, 'Title not found');
    }

    const data: Prisma.TitleUpdateInput = {};
    if (updates.name !== undefined) {
      data.name = updates.name;
    }
    if (updates.description !== undefined) {
      data.description = updates.description;
    }
    if (updates.coverKey !== undefined) {
      data.coverKey = updates.coverKey;
    }
    if (updates.published !== undefined) {
      data.published = updates.published;
    }

    const updatedTitle = await prisma.title.update({
      where: { id: existing.id },
      data,
      include: {
        episodes: {
          orderBy: { number: 'asc' },
        },
      },
    });

    res.json({ title: toTitleDto(true)(updatedTitle) });
  }),
);

episodesRouter.post(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = slugSchema.parse(req.params);
    const title = await prisma.title.findFirst({
      where: buildSlugWhere(slug),
    });

    if (!title) {
      throw new HttpError(404, 'Title not found');
    }

    const data = episodeCreateSchema.parse(req.body);

    try {
      const episode = await prisma.episode.create({
        data: {
          titleId: title.id,
          number: data.number,
          name: data.name,
          playerSrc: data.playerSrc,
          durationMinutes: data.durationMinutes ?? null,
          published: data.published ?? false,
        },
      });

      res.status(201).json({ episode: toEpisodeDto(true, episode) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Серия с таким номером уже существует');
      }

      throw error;
    }
  }),
);

router.use('/:slug/comments', commentsRouter);
router.use('/:slug/episodes', episodesRouter);

type EpisodeWithParent = TitleWithEpisodes['episodes'][number];
type CommentAuthor = CommentWithUser['user'];

function toTitleDto(includeDrafts: boolean) {
  return (title: TitleWithEpisodes) => ({
    id: title.id,
    slug: title.slug,
    name: title.name,
    description: title.description,
    coverKey: title.coverKey,
    published: title.published,
    createdAt: title.createdAt,
    updatedAt: title.updatedAt,
    episodes: title.episodes
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((episode: EpisodeWithParent) => toEpisodeDto(includeDrafts, episode)),
  });
}

function toEpisodeDto(includeDrafts: boolean, episode: EpisodeModel) {
  return {
    id: episode.id,
    number: episode.number,
    name: episode.name,
    durationMinutes: episode.durationMinutes,
    playerSrc: includeDrafts || episode.published ? episode.playerSrc : undefined,
    published: episode.published,
  };
}

function toCommentDto(includeStatus: boolean) {
  return (comment: CommentWithUser) => ({
    id: comment.id,
    body: comment.body,
    status: includeStatus ? comment.status : undefined,
    createdAt: comment.createdAt,
    author: toCommentAuthor(comment.user),
  });
}

function toCommentAuthor(user: CommentAuthor) {
  return {
    id: user.id,
    username: user.username,
    avatarKey: user.avatarKey,
  };
}

export { router as titlesRouter };

function buildSlugWhere(slug: string) {
  return {
    slug: {
      equals: slug.trim(),
      mode: 'insensitive' as const,
    },
  };
}
