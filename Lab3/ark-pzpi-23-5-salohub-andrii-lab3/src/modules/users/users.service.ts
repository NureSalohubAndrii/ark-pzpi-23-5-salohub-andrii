import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../database';
import { carOwners, users, vehicleChecks } from '../../database/schema';
import { AppError } from '../../shared/middlewares/error.middleware';

export class UsersService {
  async getUserById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
    }
  ) {
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new AppError(404, 'User not found');
    }

    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getUserCars(userId: string) {
    const ownerships = await db.query.carOwners.findMany({
      where: eq(carOwners.userId, userId),
      with: {
        car: true,
      },
      orderBy: desc(carOwners.startedAt),
    });

    return ownerships.map(o => ({
      ...o.car,
      ownership: {
        startedAt: o.startedAt,
        endedAt: o.endedAt,
        isCurrent: o.isCurrent,
      },
    }));
  }

  async getCurrentUserCars(userId: string) {
    const ownerships = await db.query.carOwners.findMany({
      where: and(eq(carOwners.userId, userId), eq(carOwners.isCurrent, true)),
      with: {
        car: true,
      },
    });

    return ownerships.map(o => o.car);
  }

  async getUserCheckHistory(userId: string, limit: number = 50) {
    const checks = await db.query.vehicleChecks.findMany({
      where: eq(vehicleChecks.userId, userId),
      with: {
        car: true,
      },
      orderBy: desc(vehicleChecks.createdAt),
      limit,
    });

    return checks;
  }

  async deleteUser(userId: string) {
    const currentOwnerships = await db.query.carOwners.findMany({
      where: and(eq(carOwners.userId, userId), eq(carOwners.isCurrent, true)),
    });

    if (currentOwnerships.length > 0) {
      throw new AppError(
        400,
        'Cannot delete user with active car ownerships. Please transfer or remove cars first.'
      );
    }

    const [deletedUser] = await db.delete(users).where(eq(users.id, userId)).returning();

    if (!deletedUser) {
      throw new AppError(404, 'User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async getUserStats(userId: string) {
    const [ownedCars, checkHistory] = await Promise.all([
      db.query.carOwners.findMany({
        where: eq(carOwners.userId, userId),
      }),
      db.query.vehicleChecks.findMany({
        where: eq(vehicleChecks.userId, userId),
      }),
    ]);

    const currentCars = ownedCars.filter(o => o.isCurrent);

    return {
      totalCarsOwned: ownedCars.length,
      currentCarsOwned: currentCars.length,
      totalChecksPerformed: checkHistory.length,
      memberSince: (await this.getUserById(userId)).createdAt,
    };
  }
}
