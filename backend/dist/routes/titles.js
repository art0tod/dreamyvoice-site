"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.titlesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const async_handler_1 = require("../utils/async-handler");
const http_error_1 = require("../utils/http-error");
const require_auth_1 = require("../middleware/require-auth");
const require_admin_1 = require("../middleware/require-admin");
const router = (0, express_1.Router)();
exports.titlesRouter = router;
const commentsRouter = (0, express_1.Router)({ mergeParams: true });
const episodesRouter = (0, express_1.Router)({ mergeParams: true });
const titleQuerySchema = zod_1.z.object({
    includeDrafts: zod_1.z
        .union([zod_1.z.literal('1'), zod_1.z.literal('0')])
        .optional()
        .transform((value) => value === '1'),
});
const titleCreateSchema = zod_1.z.object({
    slug: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(64)
        .regex(/^[a-z0-9-]+$/, 'Slug может содержать только латинские буквы, цифры и дефис'),
    name: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(128),
    description: zod_1.z
        .string()
        .trim()
        .max(5000)
        .optional()
        .transform((value) => value || undefined),
    coverKey: zod_1.z
        .string()
        .trim()
        .max(255)
        .optional()
        .transform((value) => value || undefined),
    published: zod_1.z.boolean().optional().default(false),
});
const titleUpdateSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(128)
        .optional(),
    description: zod_1.z
        .union([zod_1.z.string().trim().max(5000), zod_1.z.null()])
        .optional(),
    coverKey: zod_1.z
        .union([zod_1.z.string().trim().max(255), zod_1.z.null()])
        .optional(),
    published: zod_1.z.boolean().optional(),
});
const episodeCreateSchema = zod_1.z.object({
    number: zod_1.z.coerce.number().int().positive().max(10000),
    name: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(128),
    playerSrc: zod_1.z.string().url(),
    durationMinutes: zod_1.z
        .union([zod_1.z.coerce.number().int().positive().max(2000), zod_1.z.literal(null)])
        .optional(),
    published: zod_1.z.boolean().optional().default(false),
});
router.get('/', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = titleQuerySchema.parse(req.query);
    const canSeeDrafts = query.includeDrafts && req.currentUser?.role === 'ADMIN';
    const titles = await prisma_1.prisma.title.findMany({
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
}));
const slugSchema = zod_1.z.object({ slug: zod_1.z.string().min(1).transform((value) => value.trim()) });
router.get('/:slug', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = slugSchema.parse(req.params);
    const includeDrafts = req.currentUser?.role === 'ADMIN';
    const title = await prisma_1.prisma.title.findFirst({
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
        throw new http_error_1.HttpError(404, 'Title not found');
    }
    res.json({ title: toTitleDto(includeDrafts)(title) });
}));
const commentBodySchema = zod_1.z.object({
    body: zod_1.z
        .string()
        .trim()
        .min(3, 'Комментарий слишком короткий')
        .max(2000, 'Комментарий слишком длинный'),
});
commentsRouter.get('/', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = slugSchema.parse(req.params);
    const includeModeration = req.currentUser?.role === 'ADMIN';
    const title = await prisma_1.prisma.title.findFirst({ where: buildSlugWhere(slug) });
    if (!title || (!title.published && !includeModeration)) {
        throw new http_error_1.HttpError(404, 'Title not found');
    }
    const comments = await prisma_1.prisma.comment.findMany({
        where: {
            titleId: title.id,
            ...(includeModeration ? {} : { status: 'APPROVED' }),
        },
        orderBy: { createdAt: 'asc' },
        include: { user: true },
    });
    res.json({ comments: comments.map(toCommentDto(includeModeration)) });
}));
commentsRouter.post('/', require_auth_1.requireAuth, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = slugSchema.parse(req.params);
    const { body } = commentBodySchema.parse(req.body);
    const user = req.currentUser;
    const title = await prisma_1.prisma.title.findFirst({ where: buildSlugWhere(slug) });
    if (!title || (!title.published && user.role !== 'ADMIN')) {
        throw new http_error_1.HttpError(404, 'Title not found');
    }
    const comment = await prisma_1.prisma.comment.create({
        data: {
            titleId: title.id,
            userId: user.id,
            body,
            status: user.role === 'ADMIN' ? 'APPROVED' : undefined,
        },
        include: { user: true },
    });
    res.status(201).json({ comment: toCommentDto(user.role === 'ADMIN')(comment) });
}));
router.post('/', require_admin_1.requireAdmin, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = titleCreateSchema.parse(req.body);
    try {
        const title = await prisma_1.prisma.title.create({
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new http_error_1.HttpError(409, 'Тайтл с таким slug уже существует');
        }
        throw error;
    }
}));
router.patch('/:slug', require_admin_1.requireAdmin, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = slugSchema.parse(req.params);
    const updates = titleUpdateSchema.parse(req.body);
    if (!Object.values(updates).some((value) => value !== undefined)) {
        throw new http_error_1.HttpError(400, 'Нет изменений для сохранения');
    }
    const existing = await prisma_1.prisma.title.findFirst({
        where: buildSlugWhere(slug),
    });
    if (!existing) {
        throw new http_error_1.HttpError(404, 'Title not found');
    }
    const data = {};
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
    const updatedTitle = await prisma_1.prisma.title.update({
        where: { id: existing.id },
        data,
        include: {
            episodes: {
                orderBy: { number: 'asc' },
            },
        },
    });
    res.json({ title: toTitleDto(true)(updatedTitle) });
}));
episodesRouter.post('/', require_admin_1.requireAdmin, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = slugSchema.parse(req.params);
    const title = await prisma_1.prisma.title.findFirst({
        where: buildSlugWhere(slug),
    });
    if (!title) {
        throw new http_error_1.HttpError(404, 'Title not found');
    }
    const data = episodeCreateSchema.parse(req.body);
    try {
        const episode = await prisma_1.prisma.episode.create({
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new http_error_1.HttpError(409, 'Серия с таким номером уже существует');
        }
        throw error;
    }
}));
router.use('/:slug/comments', commentsRouter);
router.use('/:slug/episodes', episodesRouter);
function toTitleDto(includeDrafts) {
    return (title) => ({
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
            .map((episode) => toEpisodeDto(includeDrafts, episode)),
    });
}
function toEpisodeDto(includeDrafts, episode) {
    return {
        id: episode.id,
        number: episode.number,
        name: episode.name,
        durationMinutes: episode.durationMinutes,
        playerSrc: includeDrafts || episode.published ? episode.playerSrc : undefined,
        published: episode.published,
    };
}
function toCommentDto(includeStatus) {
    return (comment) => ({
        id: comment.id,
        body: comment.body,
        status: includeStatus ? comment.status : undefined,
        createdAt: comment.createdAt,
        author: toCommentAuthor(comment.user),
    });
}
function toCommentAuthor(user) {
    return {
        id: user.id,
        username: user.username,
        avatarKey: user.avatarKey,
    };
}
function buildSlugWhere(slug) {
    return {
        slug: {
            equals: slug.trim(),
            mode: 'insensitive',
        },
    };
}
