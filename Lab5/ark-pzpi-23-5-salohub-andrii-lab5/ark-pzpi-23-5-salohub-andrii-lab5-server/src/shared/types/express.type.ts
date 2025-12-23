import type { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';

export type ExpressHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;
