import type { RequestHandler } from 'express';

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.currentUser?.role === 'ADMIN') {
    return next();
  }

  const wantsHtml = req.accepts('html');
  if (wantsHtml) {
    return res.redirect('/admin/auth/login');
  }

  return res.status(403).json({ message: 'Admin access required' });
};
