"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const async_handler_1 = require("../utils/async-handler");
const auth_1 = require("../services/auth");
const session_1 = require("../services/session");
const http_error_1 = require("../utils/http-error");
const router = (0, express_1.Router)();
exports.adminAuthRouter = router;
const credentialsSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(32),
    password: zod_1.z.string().min(6).max(128),
});
router.get('/login', (req, res) => {
    if (req.currentUser?.role === 'ADMIN') {
        return res.redirect('/admin');
    }
    res.type('html').send(renderLoginPage());
});
router.post('/login', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await (0, auth_1.authenticateUser)({ username, password });
    if (!user || user.role !== 'ADMIN') {
        throw new http_error_1.HttpError(401, 'Недостаточно прав или неверные данные');
    }
    const { session, expiresAt } = await (0, session_1.createSession)(user.id, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
    });
    (0, session_1.setSessionCookie)(res, session.id, expiresAt);
    if (req.accepts('json')) {
        return res.json({ user: (0, auth_1.toPublicUser)(user) });
    }
    return res.redirect('/admin');
}));
router.post('/logout', (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (req.currentSession) {
        await (0, session_1.deleteSession)(req.currentSession.id);
    }
    (0, session_1.clearSessionCookie)(res);
    if (req.accepts('json')) {
        return res.status(204).send();
    }
    return res.redirect('/admin/auth/login');
}));
function renderLoginPage() {
    return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>DreamyVoice Admin Login</title>
  </head>
  <body>
    <main>
      <h1>Вход для админов</h1>
      <form method="post" action="/admin/auth/login">
        <label>
          Никнейм
          <input type="text" name="username" required minlength="3" maxlength="32" />
        </label>
        <label>
          Пароль
          <input type="password" name="password" required minlength="6" maxlength="128" />
        </label>
        <button type="submit">Войти</button>
      </form>
    </main>
  </body>
</html>`;
}
