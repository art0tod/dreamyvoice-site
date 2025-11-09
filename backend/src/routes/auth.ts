import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler';
import { authenticateUser, registerUser, toPublicUser } from '../services/auth';
import { createSession, deleteSession, setSessionCookie, clearSessionCookie } from '../services/session';
import { HttpError } from '../utils/http-error';

const router = Router();

const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(128),
});

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await registerUser({ username, password });
    const { session, expiresAt } = await createSession(user.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    setSessionCookie(res, session.id, expiresAt);

    res.status(201).json({ user: toPublicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = credentialsSchema.parse(req.body);
    const user = await authenticateUser({ username, password });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const { session, expiresAt } = await createSession(user.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    setSessionCookie(res, session.id, expiresAt);

    res.json({ user: toPublicUser(user) });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    if (req.currentSession) {
      await deleteSession(req.currentSession.id);
    }

    clearSessionCookie(res);
    res.status(204).send();
  }),
);

router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.currentUser) {
      throw new HttpError(401, 'Not authenticated');
    }

    res.json({ user: toPublicUser(req.currentUser) });
  }),
);

export { router as authRouter };
