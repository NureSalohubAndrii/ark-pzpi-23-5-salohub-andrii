import { Request, Response, NextFunction } from 'express';
import { IoTService } from './iot.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

const iotService = new IoTService();

export class IoTController {
  /**
   * GET /api/iot/sync/:vin
   * IoT пристрій синхронізує початкові дані
   */
  async syncDevice(req: Request, res: Response, next: NextFunction) {
    try {
      const { vin } = req.params;
      const result = await iotService.syncDevice(vin);

      res.json({
        success: true,
        data: result,
        message: 'Device synchronized successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/iot/telemetry
   * IoT пристрій надсилає телеметрію
   */
  async receiveTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const { vin, mileage, fuelLevel, humidity, batteryVoltage, engineRunning, eventType } =
        req.body;

      // Валідація обов'язкових полів
      if (!vin || mileage === undefined || engineRunning === undefined || !eventType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: vin, mileage, engineRunning, eventType',
        });
      }

      const result = await iotService.receiveTelemetry({
        vin,
        mileage,
        fuelLevel,
        humidity,
        batteryVoltage,
        engineRunning,
        eventType,
      });

      res.json({
        success: true,
        data: result,
        message:
          result.alerts.length > 0
            ? 'Telemetry received with alerts'
            : 'Telemetry received successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/iot/telemetry/:vin/history
   * Отримання історії телеметрії (для веб-інтерфейсу)
   */
  async getTelemetryHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { vin } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const result = await iotService.getTelemetryHistory(vin, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/iot/telemetry/:vin/latest
   * Отримання останніх даних (для дашборду)
   */
  async getLatestTelemetry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { vin } = req.params;
      const result = await iotService.getLatestTelemetry(vin);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/iot/telemetry/:vin/stats
   * Статистика по IoT даних
   */
  async getTelemetryStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { vin } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const result = await iotService.getTelemetryStats(vin, days);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
