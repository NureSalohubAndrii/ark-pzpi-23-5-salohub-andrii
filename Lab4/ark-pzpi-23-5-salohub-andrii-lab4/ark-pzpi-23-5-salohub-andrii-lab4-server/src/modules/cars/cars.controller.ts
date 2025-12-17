import { Response, NextFunction } from 'express';
import { CarsService } from './cars.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { ApiResponse } from '../../shared/types/response.type';

const carsService = new CarsService();

export class CarsController {
  async createCar(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const car = await carsService.createCar({
        ...req.body,
        userId: req.userId!,
      });

      res.status(201).json({
        success: true,
        data: car,
        message: 'Car created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCarByVIN(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const car = await carsService.getCarByVIN(req.params.vin);

      res.json({
        success: true,
        data: car,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCar(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const car = await carsService.updateCar(req.params.id, req.body, req.userId!);

      res.json({
        success: true,
        data: car,
        message: 'Vehicle updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
