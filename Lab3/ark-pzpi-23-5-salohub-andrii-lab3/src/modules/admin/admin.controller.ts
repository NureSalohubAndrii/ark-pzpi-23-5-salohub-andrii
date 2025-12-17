import { Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { ApiResponse } from '../../shared/types/response.type';

const adminService = new AdminService();

export class AdminController {
  async blockUser(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const result = await adminService.blockUser(userId, reason);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unblockUser(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { userId } = req.params;
      const result = await adminService.unblockUser(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createBackup(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await adminService.createDatabaseBackup();
      res.json({
        success: true,
        data: result,
        message: 'Database backup created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDbStats(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await adminService.getDatabaseAnalysis();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async optimizeDb(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await adminService.performMaintenance();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBackups(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await adminService.getAvailableBackups();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async restoreBackup(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename is required' });
      }

      const result = await adminService.restoreDatabase(filename);
      res.json({
        success: true,
        data: result,
        message: 'System recovery completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBackup(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { filename } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Filename is required and must be a string',
        });
      }

      const result = await adminService.deleteBackup(filename);
      res.json({
        success: true,
        data: result,
        message: 'Backup deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCarsAwaitingVerification(
    req: AuthRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await adminService.getCarsAwaitingVerification(limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyCar(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { carId } = req.params;
      const { isVerified, verificationNotes } = req.body;
      const adminId = req.userId!;
      const result = await adminService.verifyCar(carId, adminId, {
        isVerified,
        verificationNotes,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getVerificationStats(_: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const result = await adminService.getVerificationStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const limitMinutes = parseInt(req.query.limitMinutes as string) || 60;
      const result = await adminService.getRecentActivity(limitMinutes);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
