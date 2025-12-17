import { eq, desc, and, gte } from 'drizzle-orm';
import { db } from '../../database';
import { cars, iotTelemetry, carEvents } from '../../database/schema';
import { AppError } from '../../shared/middlewares/error.middleware';
import { CarsService } from '../cars/cars.service';

const carsService = new CarsService();

export class IoTService {
  /**
   * Синхронізація IoT пристрою - отримання поточних даних машини
   */
  async syncDevice(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    // Отримуємо останню телеметрію (якщо є)
    const lastTelemetry = await db.query.iotTelemetry.findFirst({
      where: eq(iotTelemetry.carId, car.id),
      orderBy: desc(iotTelemetry.timestamp),
    });

    return {
      vin: car.vin,
      currentMileage: car.currentMileage,
      lastSync: lastTelemetry?.timestamp || null,
      // Дефолтні значення для початкової синхронізації
      defaults: {
        fuelLevel: 50.0,
        humidity: 45.0,
        batteryVoltage: 12.6,
      },
    };
  }

  /**
   * Прийом телеметрії з IoT пристрою
   */
  async receiveTelemetry(data: {
    vin: string;
    mileage: number;
    fuelLevel?: number;
    humidity?: number;
    batteryVoltage?: number;
    engineRunning: boolean;
    eventType: 'periodic' | 'engine_start' | 'engine_stop';
  }) {
    const vinUpper = data.vin.toUpperCase();

    // Знаходимо машину
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vinUpper),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vinUpper} not found`);
    }

    // Перевіряємо на скручування пробігу
    await this.checkMileageTampering(car.id, data.mileage, car.currentMileage);

    // Зберігаємо телеметрію
    const [telemetry] = await db
      .insert(iotTelemetry)
      .values({
        carId: car.id,
        vin: vinUpper,
        mileage: data.mileage,
        fuelLevel: data.fuelLevel?.toString(),
        humidity: data.humidity?.toString(),
        batteryVoltage: data.batteryVoltage?.toString(),
        engineRunning: data.engineRunning,
        eventType: data.eventType,
        timestamp: new Date(),
      })
      .returning();

    // Оновлюємо пробіг у машині (якщо новий більший)
    if (data.mileage > car.currentMileage) {
      await db
        .update(cars)
        .set({
          currentMileage: data.mileage,
          updatedAt: new Date(),
        })
        .where(eq(cars.id, car.id));
    }

    // Створюємо event при запуску/зупинці двигуна
    if (data.eventType === 'engine_start' || data.eventType === 'engine_stop') {
      await db.insert(carEvents).values({
        carId: car.id,
        eventType: 'mileage_update',
        severity: 'low',
        description: `Engine ${data.eventType === 'engine_start' ? 'started' : 'stopped'} at ${data.mileage} km (IoT verified)`,
        mileage: data.mileage,
        verifiedByIot: true,
        eventDate: new Date(),
      });
    }

    // Перевірка критичних параметрів
    const alerts = this.checkCriticalParameters(data);

    return {
      success: true,
      telemetryId: telemetry.id,
      carVin: car.vin,
      mileageUpdated: data.mileage > car.currentMileage,
      alerts,
      timestamp: telemetry.timestamp,
    };
  }

  /**
   * Перевірка на скручування пробігу
   */
  private async checkMileageTampering(carId: string, newMileage: number, currentMileage: number) {
    // Отримуємо останню IoT телеметрію
    const lastTelemetry = await db.query.iotTelemetry.findFirst({
      where: eq(iotTelemetry.carId, carId),
      orderBy: desc(iotTelemetry.timestamp),
    });

    if (lastTelemetry && newMileage < lastTelemetry.mileage) {
      // КРИТИЧНО! Пробіг зменшився
      await db.insert(carEvents).values({
        carId,
        eventType: 'mileage_tampering',
        severity: 'critical',
        description: `CRITICAL: IoT detected mileage rollback! Previous: ${lastTelemetry.mileage} km → Current: ${newMileage} km (Δ: ${lastTelemetry.mileage - newMileage} km)`,
        mileage: newMileage,
        verifiedByIot: true,
        eventDate: new Date(),
      });

      // Оновлюємо ризик-скор
      await carsService.updateRiskScore(carId);

      throw new AppError(
        400,
        `Mileage tampering detected! Previous IoT reading: ${lastTelemetry.mileage} km, Current: ${newMileage} km`
      );
    }

    // Перевірка на неймовірно високий приріст
    if (lastTelemetry) {
      const timeDiff =
        (new Date().getTime() - new Date(lastTelemetry.timestamp).getTime()) /
        (1000 * 60 * 60 * 24); // days
      const mileageDiff = newMileage - lastTelemetry.mileage;
      const dailyMileage = mileageDiff / timeDiff;

      if (dailyMileage > 1000) {
        // Більше 1000 км/день - підозріло
        await db.insert(carEvents).values({
          carId,
          eventType: 'mileage_tampering',
          severity: 'high',
          description: `Suspicious high mileage increase: ${Math.round(mileageDiff)} km in ${timeDiff.toFixed(1)} days (${Math.round(dailyMileage)} km/day)`,
          mileage: newMileage,
          verifiedByIot: true,
          eventDate: new Date(),
        });
      }
    }
  }

  /**
   * Перевірка критичних параметрів
   */
  private checkCriticalParameters(data: {
    fuelLevel?: number;
    humidity?: number;
    batteryVoltage?: number;
  }): string[] {
    const alerts: string[] = [];

    if (data.batteryVoltage && data.batteryVoltage < 11.8) {
      alerts.push('Low battery voltage - battery may need replacement');
    }

    if (data.humidity && data.humidity > 80) {
      alerts.push('High humidity detected - check for leaks');
    }

    if (data.fuelLevel && data.fuelLevel < 10) {
      alerts.push('Low fuel level');
    }

    return alerts;
  }

  /**
   * Отримання історії телеметрії
   */
  async getTelemetryHistory(vin: string, limit: number = 100) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const telemetry = await db.query.iotTelemetry.findMany({
      where: eq(iotTelemetry.carId, car.id),
      orderBy: desc(iotTelemetry.timestamp),
      limit,
    });

    return {
      vin: car.vin,
      totalRecords: telemetry.length,
      telemetry,
    };
  }

  /**
   * Отримання останніх даних (для дашборду)
   */
  async getLatestTelemetry(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const latest = await db.query.iotTelemetry.findFirst({
      where: eq(iotTelemetry.carId, car.id),
      orderBy: desc(iotTelemetry.timestamp),
    });

    if (!latest) {
      return {
        vin: car.vin,
        message: 'No IoT data available yet',
        iotConnected: false,
      };
    }

    // Перевіряємо чи дані свіжі (< 1 години)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isOnline = new Date(latest.timestamp) > hourAgo;

    return {
      vin: car.vin,
      iotConnected: isOnline,
      lastUpdate: latest.timestamp,
      data: {
        mileage: latest.mileage,
        fuelLevel: latest.fuelLevel ? parseFloat(latest.fuelLevel) : null,
        humidity: latest.humidity ? parseFloat(latest.humidity) : null,
        batteryVoltage: latest.batteryVoltage ? parseFloat(latest.batteryVoltage) : null,
        engineRunning: latest.engineRunning,
      },
    };
  }

  /**
   * Статистика по IoT даних за період
   */
  async getTelemetryStats(vin: string, days: number = 30) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const telemetry = await db.query.iotTelemetry.findMany({
      where: and(eq(iotTelemetry.carId, car.id), gte(iotTelemetry.timestamp, startDate)),
      orderBy: iotTelemetry.timestamp,
    });

    if (telemetry.length === 0) {
      return {
        vin: car.vin,
        period: `Last ${days} days`,
        message: 'No data available for this period',
      };
    }

    // Аналіз даних
    const mileages = telemetry.map(t => t.mileage);
    const totalMileage = Math.max(...mileages) - Math.min(...mileages);
    const avgDailyMileage = totalMileage / days;

    const engineStarts = telemetry.filter(t => t.eventType === 'engine_start').length;

    return {
      vin: car.vin,
      period: `Last ${days} days`,
      totalDataPoints: telemetry.length,
      mileageStats: {
        totalMileageDriven: totalMileage,
        averageDailyMileage: Math.round(avgDailyMileage),
        startMileage: Math.min(...mileages),
        endMileage: Math.max(...mileages),
      },
      usage: {
        engineStarts,
        averageTripsPerDay: (engineStarts / days).toFixed(1),
      },
      lastUpdate: telemetry[telemetry.length - 1].timestamp,
    };
  }
}
