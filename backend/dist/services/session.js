"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.deleteSession = deleteSession;
exports.setSessionCookie = setSessionCookie;
exports.clearSessionCookie = clearSessionCookie;
const env_1 = require("../env");
const prisma_1 = require("../prisma");
const sessionTtlMs = env_1.env.SESSION_TTL_HOURS * 60 * 60 * 1000;
async function createSession(userId, meta) {
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    const session = await prisma_1.prisma.session.create({
        data: {
            userId,
            expiresAt,
            userAgent: meta.userAgent ?? null,
            ip: meta.ip ?? null,
        },
    });
    return { session, expiresAt };
}
async function deleteSession(sessionId) {
    await prisma_1.prisma.session.deleteMany({ where: { id: sessionId } });
}
function setSessionCookie(res, sessionId, expiresAt) {
    res.cookie(env_1.env.SESSION_COOKIE_NAME, sessionId, {
        ...env_1.env.sessionCookieOptions,
        maxAge: expiresAt.getTime() - Date.now(),
    });
}
function clearSessionCookie(res) {
    res.clearCookie(env_1.env.SESSION_COOKIE_NAME, env_1.env.sessionCookieOptions);
}
