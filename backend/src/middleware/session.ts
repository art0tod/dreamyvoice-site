import type { RequestHandler } from 'express';
import { env } from '../env';
import { prisma } from '../prisma';
import { clearSessionCookie } from '../services/session';

export const sessionMiddleware: RequestHandler = async (req, res, next) => {
  const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];

  if (!sessionId) {
    return next();
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    clearSessionCookie(res);
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return next();
  }

  req.currentSession = session;
  req.currentUser = session.user;

  return next();
};
