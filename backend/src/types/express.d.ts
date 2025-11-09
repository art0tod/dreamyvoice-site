import type { User, Session } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
      currentSession?: Session & { user: User };
    }
  }
}

export {};
