"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const async_handler_1 = require("../utils/async-handler");
const auth_1 = require("../services/auth");
const session_1 = require("../services/session");
const http_error_1 = require("../utils/http-error");
const router = (0, express_1.Router)();
exports.authRouter = router;
const credentialsSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(32),
    password: zod_1.z.string().min(6).max(128),
});
router.post('/register', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await (0, auth_1.registerUser)({ username, password });
    const { session, expiresAt } = await (0, session_1.createSession)(user.id, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
    });
    (0, session_1.setSessionCookie)(res, session.id, expiresAt);
    res.status(201).json({ user: (0, auth_1.toPublicUser)(user) });
}));
router.post('/login', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await (0, auth_1.authenticateUser)({ username, password });
    if (!user) {
        throw new http_error_1.HttpError(401, 'Invalid credentials');
    }
    const { session, expiresAt } = await (0, session_1.createSession)(user.id, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
    });
    (0, session_1.setSessionCookie)(res, session.id, expiresAt);
    res.json({ user: (0, auth_1.toPublicUser)(user) });
}));
router.post('/logout', (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (req.currentSession) {
        await (0, session_1.deleteSession)(req.currentSession.id);
    }
    (0, session_1.clearSessionCookie)(res);
    res.status(204).send();
}));
router.get('/me', (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.currentUser) {
        throw new http_error_1.HttpError(401, 'Not authenticated');
    }
    res.json({ user: (0, auth_1.toPublicUser)(req.currentUser) });
}));
