import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/types/response.type';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { AppError } from '../../shared/middlewares/error.middleware';
import { db } from '../../database';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Please verify your email.',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await authService.login(req.body);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { code } = req.body;
      const userId = req.params.userId;
      const result = await authService.verifyEmail(userId, code);

      res.json({
        success: true,
        data: result,
        message: 'Email verified successfully. You are now logged in.',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await authService.refreshToken(req.userId!);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      res.clearCookie('token');

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.userId!),
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
