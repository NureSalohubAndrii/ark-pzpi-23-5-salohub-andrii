import { eq, and, sql, desc } from 'drizzle-orm';
import { validateVIN } from '../../shared/utils/validation.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import { db } from '../../database';
import { carEvents, carOwners, cars } from '../../database/schema';

export class CarsService {
  async createCar(data: {
    vin: string;
    make: string;
    model: string;
    year: number;
    color?: string;
    engineType?: string;
    transmission?: string;
    fuelType?: string;
    ownershipDocumentUrl?: string;
    currentMileage?: number;
    mileageUnit?: 'km' | 'mi';
    description?: string;
    userId: string;
  }) {
    if (!validateVIN(data.vin)) {
      throw new AppError(400, 'Invalid VIN format');
    }

    if (data.currentMileage !== undefined && data.currentMileage < 0) {
      throw new AppError(400, 'Mileage cannot be negative');
    }

    const existingCar = await db.query.cars.findFirst({
      where: eq(cars.vin, data.vin),
    });

    if (existingCar) {
      throw new AppError(400, 'Car with this VIN already exists');
    }

    const [car] = await db
      .insert(cars)
      .values({
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color,
        engineType: data.engineType,
        transmission: data.transmission,
        fuelType: data.fuelType,
        ownershipDocumentUrl: data.ownershipDocumentUrl,
        currentMileage: data.currentMileage,
        mileageUnit: data.mileageUnit || 'km',
        description: data.description,
      })
      .returning();

    await db.insert(carOwners).values({
      carId: car.id,
      userId: data.userId,
      isCurrent: true,
      startedMileage: data.currentMileage || null,
    });

    return car;
  }

  async getCarByVIN(vin: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.vin, vin),
      with: {
        carOwners: {
          where: eq(carOwners.isCurrent, true),
        },
      },
    });

    if (!car) {
      throw new AppError(404, 'Car not found');
    }

    return car;
  }

  async getCarById(id: string) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.id, id),
    });

    if (!car) {
      throw new AppError(404, 'Car not found');
    }

    return car;
  }

  async updateCar(
    carId: string,
    data: Partial<{
      currentMileage?: number;
      description?: string | null;
      color?: string | null;
      ownershipDocumentUrl?: string | null;
    }>,
    userId: string
  ) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.id, carId),
      with: {
        carOwners: {
          where: eq(carOwners.isCurrent, true),
          columns: { userId: true },
        },
      },
    });

    if (!car) {
      throw new AppError(404, 'Car not found');
    }

    const currentOwner = car.carOwners[0];
    if (!currentOwner || currentOwner.userId !== userId) {
      throw new AppError(403, 'You are not the current owner of this vehicle');
    }

    if (data.currentMileage !== undefined) {
      if (data.currentMileage < 0) {
        throw new AppError(400, 'Mileage cannot be negative');
      }

      const oldMileage = car.currentMileage ?? 0;
      if (data.currentMileage < oldMileage) {
        await db.insert(carEvents).values({
          carId,
          eventType: 'mileage_tampering',
          severity: 'high',
          description: `Mileage rollback detected: ${oldMileage} → ${data.currentMileage} km`,
          mileage: data.currentMileage,
          eventDate: new Date(),
          verifiedByIot: false,
        });

        await this.updateRiskScore(carId);
      }
    }

    const updatedFields: Partial<typeof cars.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedCar] = await db
      .update(cars)
      .set(updatedFields)
      .where(eq(cars.id, carId))
      .returning();

    return updatedCar!;
  }

  async calculateRiskScore(carId: string): Promise<number> {
    let score = 0;

    const tamperingEvents = await db.query.carEvents.findMany({
      where: and(eq(carEvents.carId, carId), eq(carEvents.eventType, 'mileage_tampering')),
    });
    score += tamperingEvents.length * 40;

    const accidents = await db.query.carEvents.findMany({
      where: and(
        eq(carEvents.carId, carId),
        eq(carEvents.eventType, 'accident'),
        eq(carEvents.severity, 'high')
      ),
    });
    score += accidents.length * 20;

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const recentOwners = await db.query.carOwners.findMany({
      where: and(eq(carOwners.carId, carId), sql`${carOwners.startedAt} >= ${threeYearsAgo}`),
    });

    if (recentOwners.length > 4) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  async updateCarInternally(carId: string, data: Partial<typeof cars.$inferInsert>) {
    const [updated] = await db
      .update(cars)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cars.id, carId))
      .returning();

    return updated!;
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 30) return 'low';
    if (score <= 70) return 'medium';
    return 'high';
  }

  async updateRiskScore(carId: string) {
    const score = await this.calculateRiskScore(carId);
    const riskLevel = this.getRiskLevel(score);

    await this.updateCarInternally(carId, {
      riskScore: score,
      riskLevel,
    });

    return score;
  }

  async getCarReport(vin: string) {
    const car = await this.getCarByVIN(vin.toUpperCase());

    const [events, owners] = await Promise.all([
      db.query.carEvents.findMany({
        where: eq(carEvents.carId, car.id),
        orderBy: desc(carEvents.eventDate),
      }),
      db.query.carOwners.findMany({
        where: eq(carOwners.carId, car.id),
        orderBy: desc(carOwners.startedAt),
      }),
    ]);

    return {
      car,
      events: events ?? [],
      owners: owners ?? [],
    };
  }
}
