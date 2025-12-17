import { Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { ApiResponse } from '../../shared/types/response.type';
import { AppError } from '../../shared/middlewares/error.middleware';

const usersService = new UsersService();

export class UsersController {
  async getProfile(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const user = await usersService.getUserById(req.userId!);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const user = await usersService.updateUser(req.userId!, req.body);

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      if (req.userRole !== 'admin' && req.userId !== req.params.id) {
        throw new AppError(403, 'Access denied');
      }

      const user = await usersService.getUserById(req.params.id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyCars(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const cars = await usersService.getCurrentUserCars(req.userId!);

      res.json({
        success: true,
        data: cars,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyCarHistory(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const cars = await usersService.getUserCars(req.userId!);

      res.json({
        success: true,
        data: cars,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyCheckHistory(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const checks = await usersService.getUserCheckHistory(req.userId!, limit);

      res.json({
        success: true,
        data: checks,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyStats(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const stats = await usersService.getUserStats(req.userId!);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await usersService.deleteUser(req.userId!);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
