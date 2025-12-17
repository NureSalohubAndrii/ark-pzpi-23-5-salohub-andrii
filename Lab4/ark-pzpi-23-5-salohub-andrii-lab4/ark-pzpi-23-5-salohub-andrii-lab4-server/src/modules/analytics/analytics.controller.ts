import { Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { ApiResponse } from '../../shared/types/response.type';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { AppError } from '../../shared/middlewares/error.middleware';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getMileageAnomalies(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { carId } = req.params;

      const result = await analyticsService.detectMileageAnomalies(carId);

      res.json({
        success: true,
        data: result,
        message:
          result.anomalies.length > 0
            ? `Found ${result.anomalies.length} mileage anomalies`
            : 'No mileage anomalies detected',
      });
    } catch (error) {
      next(error);
    }
  }

  async predictMileage(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { carId } = req.params;
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 365;

      if (daysAhead <= 0 || daysAhead > 3650) {
        throw new AppError(400, 'Days ahead must be between 1 and 3650 (10 years)');
      }

      const result = await analyticsService.predictFutureMileage(carId, daysAhead);

      if (result.error) {
        throw new AppError(400, result.error);
      }

      res.json({
        success: true,
        data: result,
        message: 'Mileage prediction calculated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemAnalytics(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (startDate && isNaN(startDate.getTime())) {
        throw new AppError(400, 'Invalid start date format');
      }

      if (endDate && isNaN(endDate.getTime())) {
        throw new AppError(400, 'Invalid end date format');
      }

      if (startDate && endDate && startDate > endDate) {
        throw new AppError(400, 'Start date must be before end date');
      }

      const result = await analyticsService.getGlobalSystemAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: result,
        message: 'System analytics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserBehavior(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { userId } = req.params;

      const result = await analyticsService.getUserBehaviorAnalytics(userId);

      res.json({
        success: true,
        data: result,
        message: 'User behavior analytics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getHighRiskCars(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (limit <= 0 || limit > 100) {
        throw new AppError(400, 'Limit must be between 1 and 100');
      }

      const result = await analyticsService.getHighRiskCarsReport(limit);

      res.json({
        success: true,
        data: result,
        message: `Retrieved ${result.length} high-risk cars`,
      });
    } catch (error) {
      next(error);
    }
  }
}
