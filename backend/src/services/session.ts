import type { Response } from 'express';
import { env } from '../env';
import { prisma } from '../prisma';

const sessionTtlMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null }) {
  const expiresAt = new Date(Date.now() + sessionTtlMs);
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    },
  });

  return { session, expiresAt };
}

export async function deleteSession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.cookie(env.SESSION_COOKIE_NAME, sessionId, {
    ...env.sessionCookieOptions,
    maxAge: expiresAt.getTime() - Date.now(),
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.SESSION_COOKIE_NAME, env.sessionCookieOptions);
}
