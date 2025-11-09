import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.currentUser) {
    throw new HttpError(401, 'Authentication required');
  }

  next();
};
