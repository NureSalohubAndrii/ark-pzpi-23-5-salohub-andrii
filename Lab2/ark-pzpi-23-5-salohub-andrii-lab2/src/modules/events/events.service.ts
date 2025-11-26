import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { carEvents } from '../../database/schema';
import { CarsService } from '../cars/cars.service';
import { db } from '../../database';
import { AppError } from '../../shared/middlewares/error.middleware';

const carsService = new CarsService();

export class EventsService {
  async createEvent(data: {
    carId: string;
    eventType: string;
    severity?: string;
    description?: string;
    mileage?: number;
    location?: string;
    cost?: string;
    documentUrl?: string;
    reportedBy?: string;
    eventDate: Date;
  }) {
    if (data.mileage) {
      await this.checkMileageTampering(data.carId, data.mileage);
    }

    const [event] = await db
      .insert(carEvents)
      .values({
        ...data,
        cost: data.cost ? data.cost : undefined,
      })
      .returning();

    await carsService.updateRiskScore(data.carId);

    return event;
  }

  private async checkMileageTampering(carId: string, newMileage: number) {
    const previousEvents = await db.query.carEvents.findMany({
      where: and(eq(carEvents.carId, carId), sql`${carEvents.mileage} IS NOT NULL`),
      orderBy: desc(carEvents.eventDate),
    });

    for (const event of previousEvents) {
      if (event.mileage && newMileage < event.mileage) {
        await db.insert(carEvents).values({
          carId,
          eventType: 'mileage_tampering',
          severity: 'critical',
          description: `Mileage rollback detected: ${newMileage} km < ${event.mileage} km`,
          mileage: newMileage,
          verifiedByIot: false,
          eventDate: new Date(),
        });

        const car = await carsService.getCarById(carId);
        const newRiskScore = Math.min(car.riskScore + 40, 100);
        await carsService.updateCarInternally(carId, {
          riskScore: newRiskScore,
          status: newRiskScore >= 90 ? 'blocked' : car.status,
        });

        throw new AppError(400, 'Mileage tampering detected! Car status updated.');
      }
    }
  }

  async getCarEvents(
    carId: string,
    filters?: {
      eventType?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    let conditions = [eq(carEvents.carId, carId)];

    if (filters?.eventType) {
      conditions.push(eq(carEvents.eventType, filters.eventType));
    }
    if (filters?.severity) {
      conditions.push(eq(carEvents.severity, filters.severity));
    }
    if (filters?.startDate) {
      conditions.push(gte(carEvents.eventDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(carEvents.eventDate, filters.endDate));
    }

    return db.query.carEvents.findMany({
      where: and(...conditions),
      orderBy: desc(carEvents.eventDate),
    });
  }

  async updateEvent(
    eventId: string,
    data: Partial<{
      description?: string | null;
      cost?: string | null;
      documentUrl?: string | null;
      severity?: string | null;
    }>,
    userId: string
  ) {
    const event = await db.query.carEvents.findFirst({
      where: eq(carEvents.id, eventId),
      with: {
        reportedByUser: {
          columns: { id: true },
        },
      },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    if (event.reportedBy !== userId) {
      throw new AppError(403, 'You can only edit events you created');
    }

    const updatedFields = {
      ...data,
      updatedAt: new Date(),
    };

    const [updatedEvent] = await db
      .update(carEvents)
      .set(updatedFields)
      .where(eq(carEvents.id, eventId))
      .returning();

    await carsService.updateRiskScore(event.carId);

    return updatedEvent!;
  }

  async deleteEvent(eventId: string) {
    const [event] = await db.delete(carEvents).where(eq(carEvents.id, eventId)).returning();

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    await carsService.updateRiskScore(event.carId);

    return event;
  }
}
