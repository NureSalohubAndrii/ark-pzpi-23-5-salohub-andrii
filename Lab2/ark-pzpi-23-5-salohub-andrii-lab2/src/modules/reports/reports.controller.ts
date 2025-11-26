import { Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { ApiResponse } from '../../shared/types/response.type';

const reportsService = new ReportsService();

export class ReportsController {
  async generateReport(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { vin } = req.params;
      const checkType = (req.query.type as 'basic' | 'extended' | 'premium') || 'basic';

      const report = await reportsService.generateReport(vin, req.userId!, checkType);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
