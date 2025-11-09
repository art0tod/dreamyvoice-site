"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
const env_1 = require("../env");
const prisma_1 = require("../prisma");
const session_1 = require("../services/session");
const sessionMiddleware = async (req, res, next) => {
    const sessionId = req.cookies?.[env_1.env.SESSION_COOKIE_NAME];
    if (!sessionId) {
        return next();
    }
    const session = await prisma_1.prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
        (0, session_1.clearSessionCookie)(res);
        if (session) {
            await prisma_1.prisma.session.delete({ where: { id: session.id } }).catch(() => { });
        }
        return next();
    }
    req.currentSession = session;
    req.currentUser = session.user;
    return next();
};
exports.sessionMiddleware = sessionMiddleware;
