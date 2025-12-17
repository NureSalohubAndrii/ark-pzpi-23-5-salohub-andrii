import { eq, desc, and, gte } from 'drizzle-orm';
import { db } from '../../database';
import { cars, iotTelemetry, carEvents, iotConfig } from '../../database/schema';
import { AppError } from '../../shared/middlewares/error.middleware';
import { CarsService } from '../cars/cars.service';
import { EventsService } from '../events/events.service';

const carsService = new CarsService();
const eventsService = new EventsService();

export class IoTService {
  async syncDevice(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const config = await this.getDeviceConfig(vin);

    await db.update(iotConfig).set({ lastSync: new Date() }).where(eq(iotConfig.carId, car.id));

    const lastTelemetry = await db.query.iotTelemetry.findFirst({
      where: eq(iotTelemetry.carId, car.id),
      orderBy: desc(iotTelemetry.timestamp),
    });

    return {
      vin: car.vin,
      currentMileage: car.currentMileage,
      lastSync: lastTelemetry?.timestamp || null,
      config,
    };
  }

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

    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vinUpper),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vinUpper} not found`);
    }

    await this.checkMileageTampering(car.id, data.mileage);

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

    if (data.mileage > car.currentMileage) {
      await db
        .update(cars)
        .set({
          currentMileage: data.mileage,
          updatedAt: new Date(),
        })
        .where(eq(cars.id, car.id));
    }

    if (data.eventType === 'engine_start' || data.eventType === 'engine_stop') {
      await db.insert(carEvents).values({
        carId: car.id,
        eventType: 'trip_update',
        severity: 'info',
        description: `Engine ${data.eventType === 'engine_start' ? 'started' : 'stopped'} at ${data.mileage} km`,
        mileage: data.mileage,
        verifiedByIot: true,
        eventDate: new Date(),
      });
    }

    const alerts = await this.processCriticalAlerts(car.id, data);

    return {
      success: true,
      telemetryId: telemetry.id,
      carVin: car.vin,
      mileageUpdated: data.mileage > car.currentMileage,
      alerts,
      timestamp: telemetry.timestamp,
    };
  }

  private async checkMileageTampering(carId: string, newMileage: number) {
    const lastTelemetry = await db.query.iotTelemetry.findFirst({
      where: eq(iotTelemetry.carId, carId),
      orderBy: desc(iotTelemetry.timestamp),
    });

    if (!lastTelemetry) {
      return;
    }

    if (newMileage < lastTelemetry.mileage) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentTamperingEvents = await db.query.carEvents.findMany({
        where: and(
          eq(carEvents.carId, carId),
          eq(carEvents.eventType, 'mileage_tampering'),
          eq(carEvents.severity, 'critical'),
          gte(carEvents.eventDate, dayAgo)
        ),
        limit: 1,
      });

      if (recentTamperingEvents.length === 0) {
        await db.insert(carEvents).values({
          carId,
          eventType: 'mileage_tampering',
          severity: 'critical',
          description: `CRITICAL: IoT detected mileage rollback! Previous: ${lastTelemetry.mileage} km → Current: ${newMileage} km`,
          mileage: newMileage,
          verifiedByIot: true,
          eventDate: new Date(),
        });

        await carsService.updateRiskScore(carId);

        console.log(`Mileage rollback detected for car ${carId}`);
      }

      return;
    }
  }

  private async processCriticalAlerts(
    carId: string,
    data: {
      fuelLevel?: number;
      humidity?: number;
      batteryVoltage?: number;
    }
  ): Promise<string[]> {
    const alerts: string[] = [];

    if (data.batteryVoltage && data.batteryVoltage < 11.8) {
      const msg = `Low battery voltage: ${data.batteryVoltage}V`;
      alerts.push(msg);

      const recent = await eventsService.getCarEvents(carId, {
        eventType: 'maintenance_battery',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      if (recent.length === 0) {
        await eventsService.createEvent({
          carId,
          eventType: 'maintenance_battery',
          severity: 'medium',
          description: msg,
          eventDate: new Date(),
        });
      }
    }

    if (data.humidity && data.humidity > 80) {
      const msg = `High humidity detected (${data.humidity}%). Possible leak.`;
      alerts.push(msg);

      const recent = await eventsService.getCarEvents(carId, {
        eventType: 'maintenance_leak',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      if (recent.length === 0) {
        await eventsService.createEvent({
          carId,
          eventType: 'maintenance_leak',
          severity: 'high',
          description: msg,
          eventDate: new Date(),
        });
      }
    }

    if (data.fuelLevel && data.fuelLevel < 10) {
      const msg = `Low fuel level: ${data.fuelLevel}%`;
      alerts.push(msg);
    }

    return alerts;
  }

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

  async getTamperingHistory(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const tamperingEvents = await db.query.carEvents.findMany({
      where: and(eq(carEvents.carId, car.id), eq(carEvents.eventType, 'mileage_tampering')),
      orderBy: desc(carEvents.eventDate),
    });

    return {
      vin: car.vin,
      totalTamperingEvents: tamperingEvents.length,
      events: tamperingEvents.map(event => ({
        id: event.id,
        severity: event.severity,
        description: event.description,
        mileage: event.mileage,
        verifiedByIot: event.verifiedByIot,
        eventDate: event.eventDate,
      })),
    };
  }

  async getDeviceConfig(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    let config = await db.query.iotConfig.findFirst({
      where: eq(iotConfig.carId, car.id),
    });

    if (!config) {
      [config] = await db
        .insert(iotConfig)
        .values({
          carId: car.id,
          targetVin: car.vin,
        })
        .returning();
    }

    return {
      targetVin: config.targetVin,
      activeInterval: config.activeInterval,
      idleInterval: config.idleInterval,
      batteryLowThreshold: config.batteryLowThreshold / 100,
      fuelLowThreshold: config.fuelLowThreshold,
      humidityHighThreshold: config.humidityHighThreshold,
      smoothing: {
        fuel: config.smoothingAlphaFuel / 100,
        battery: config.smoothingAlphaBattery / 100,
      },
      enabled: config.enabled,
      lastSync: config.lastSync,
    };
  }

  async updateDeviceConfig(
    vin: string,
    updates: {
      activeInterval?: number;
      idleInterval?: number;
      batteryLowThreshold?: number;
      fuelLowThreshold?: number;
      humidityHighThreshold?: number;
      smoothingAlphaFuel?: number;
      smoothingAlphaBattery?: number;
      enabled?: boolean;
    }
  ) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin.toUpperCase()),
    });

    if (!car) {
      throw new AppError(404, `Car with VIN ${vin} not found`);
    }

    const config = await db.query.iotConfig.findFirst({
      where: eq(iotConfig.carId, car.id),
    });

    if (!config) {
      throw new AppError(404, 'IoT config not found. Device needs to sync first.');
    }

    const updateData: any = { updatedAt: new Date() };

    if (updates.activeInterval !== undefined) updateData.activeInterval = updates.activeInterval;
    if (updates.idleInterval !== undefined) updateData.idleInterval = updates.idleInterval;
    if (updates.batteryLowThreshold !== undefined)
      updateData.batteryLowThreshold = Math.round(updates.batteryLowThreshold * 100);
    if (updates.fuelLowThreshold !== undefined)
      updateData.fuelLowThreshold = updates.fuelLowThreshold;
    if (updates.humidityHighThreshold !== undefined)
      updateData.humidityHighThreshold = updates.humidityHighThreshold;
    if (updates.smoothingAlphaFuel !== undefined)
      updateData.smoothingAlphaFuel = Math.round(updates.smoothingAlphaFuel * 100);
    if (updates.smoothingAlphaBattery !== undefined)
      updateData.smoothingAlphaBattery = Math.round(updates.smoothingAlphaBattery * 100);
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

    await db.update(iotConfig).set(updateData).where(eq(iotConfig.id, config.id));

    return {
      message: 'Configuration updated successfully',
      config: await this.getDeviceConfig(vin),
    };
  }
}
