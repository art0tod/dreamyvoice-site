import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler';
import { authenticateUser, toPublicUser } from '../services/auth';
import { createSession, setSessionCookie, clearSessionCookie, deleteSession } from '../services/session';
import { HttpError } from '../utils/http-error';

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(128),
});

router.get(
  '/login',
  (req: Request, res: Response) => {
    if (req.currentUser?.role === 'ADMIN') {
      return res.redirect('/admin');
    }

    res.type('html').send(renderLoginPage());
  },
);

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await authenticateUser({ username, password });

    if (!user || user.role !== 'ADMIN') {
      throw new HttpError(401, 'Недостаточно прав или неверные данные');
    }

    const { session, expiresAt } = await createSession(user.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    setSessionCookie(res, session.id, expiresAt);

    if (req.accepts('json')) {
      return res.json({ user: toPublicUser(user) });
    }

    return res.redirect('/admin');
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    if (req.currentSession) {
      await deleteSession(req.currentSession.id);
    }
    clearSessionCookie(res);

    if (req.accepts('json')) {
      return res.status(204).send();
    }

    return res.redirect('/admin/auth/login');
  }),
);

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

export { router as adminAuthRouter };
