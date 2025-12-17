import { eq, sql, or, desc, count, and, gte } from 'drizzle-orm';
import { db } from '../../database';
import { carEvents, carOwners, cars, users, vehicleChecks } from '../../database/schema';
import { AppError } from '../../shared/middlewares/error.middleware';
import util from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class AdminService {
  async blockUser(userId: string, reason: string) {
    const [user] = await db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, userId))
      .returning();

    if (!user) throw new AppError(404, 'User not found');

    return { userId: user.id, status: 'blocked', reason };
  }

  async unblockUser(userId: string) {
    const [user] = await db
      .update(users)
      .set({ isBlocked: false })
      .where(eq(users.id, userId))
      .returning();

    if (!user) throw new AppError(404, 'User not found');

    return { userId: user.id, status: 'active', message: 'User unblocked successfully' };
  }

  async createDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const backupPath = path.join(__dirname, '../../database/backups');

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const fullPath = path.join(backupPath, filename);

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new AppError(500, 'DATABASE_URL not found in environment variables');
    }

    try {
      const dbUrl = new URL(connectionString);

      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const user = dbUrl.username;
      const password = dbUrl.password;
      const database = dbUrl.pathname.slice(1);

      const command = `pg_dump -h ${host} -p ${port} -U ${user} --no-owner --no-acl -F p -f "${fullPath}" ${database}`;

      await execPromise(command, {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      });

      const stats = fs.statSync(fullPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      return {
        success: true,
        filename,
        path: fullPath,
        size: `${sizeInMB} MB`,
        storageType: 'Local Server Storage',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Backup failed:', error);
      throw new AppError(
        500,
        'Database backup failed. Ensure "postgresql-client" (pg_dump) is installed on the server.'
      );
    }
  }

  async getDatabaseAnalysis() {
    const result = await db.execute(sql`
      SELECT relname as "tableName", pg_total_relation_size(relid) as "sizeBytes"
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);

    const processedStats = result.rows.map((row: any) => {
      const bytes = Number(row.sizeBytes);
      let formattedSize = '';

      if (bytes < 1024) formattedSize = bytes + ' B';
      else if (bytes < 1024 * 1024) formattedSize = (bytes / 1024).toFixed(2) + ' KB';
      else formattedSize = (bytes / (1024 * 1024)).toFixed(2) + ' MB';

      return {
        tableName: row.tableName,
        rawBytes: bytes,
        formattedSize,
      };
    });

    const totalSize = processedStats.reduce((acc, curr) => acc + curr.rawBytes, 0);

    const statsWithPercentage = processedStats.map(stat => ({
      ...stat,
      percentage: ((stat.rawBytes / totalSize) * 100).toFixed(1) + '%',
    }));

    return {
      stats: statsWithPercentage,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
    };
  }

  async performMaintenance() {
    try {
      await db.execute(sql`VACUUM ANALYZE`);

      return {
        status: 'Success',
        operation: 'VACUUM ANALYZE',
        message: 'Database storage optimized and query planner statistics updated',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new AppError(500, 'Maintenance operation failed');
    }
  }

  async getAvailableBackups() {
    const backupPath = path.join(__dirname, '../../database/backups');

    if (!fs.existsSync(backupPath)) {
      return [];
    }

    const files = fs.readdirSync(backupPath);

    const backups = files
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupPath, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  }

  async deleteBackup(filename: string) {
    const safeFilename = path.basename(filename);
    console.log(safeFilename);
    const backupPath = path.join(__dirname, '../../database/backups', safeFilename);
    console.log(backupPath);

    if (!fs.existsSync(backupPath)) {
      throw new AppError(404, 'Backup file not found');
    }

    try {
      fs.unlinkSync(backupPath);
      return {
        success: true,
        filename: safeFilename,
        message: 'Backup file deleted successfully',
        deletedAt: new Date(),
      };
    } catch (error: any) {
      console.error('Delete backup failed:', error);
      throw new AppError(500, `Failed to delete backup file: ${error.message || 'Unknown error'}`);
    }
  }

  async restoreDatabase(filename: string) {
    const safeFilename = path.basename(filename);
    const backupPath = path.join(__dirname, '../../../backups', safeFilename);

    if (!fs.existsSync(backupPath)) {
      throw new AppError(404, 'Backup file not found on server');
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new AppError(500, 'DATABASE_URL missing');

    const startTime = Date.now();

    try {
      const dbUrl = new URL(connectionString);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const user = dbUrl.username;
      const password = dbUrl.password;
      const database = dbUrl.pathname.slice(1);

      const command = `psql -h ${host} -p ${port} -U ${user} -d ${database} -q -f "${backupPath}"`;

      console.log(`Starting restore from ${safeFilename}...`);

      await execPromise(command, {
        env: {
          ...process.env,
          PGPASSWORD: password,
        },
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Database restored successfully',
        restoredFrom: safeFilename,
        durationSeconds: duration,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Restore failed:', error);
      throw new AppError(
        500,
        `Restore process failed: ${error.message || 'Unknown error'}. Ensure 'psql' is installed.`
      );
    }
  }

  async verifyCar(
    carId: string,
    adminId: string,
    verificationData: {
      isVerified: boolean;
      verificationNotes?: string;
      documentsChecked?: string[];
    }
  ) {
    const car = await db.query.cars.findFirst({
      where: eq(cars.id, carId),
    });

    if (!car) throw new AppError(404, 'Car not found');

    const [updatedCar] = await db
      .update(cars)
      .set({
        isVerified: verificationData.isVerified,
        verifiedAt: verificationData.isVerified ? new Date() : null,
        verifiedBy: verificationData.isVerified ? adminId : null,
        verificationNotes: verificationData.verificationNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(cars.id, carId))
      .returning();

    await db.insert(carEvents).values({
      carId,
      eventType: 'admin_verification',
      severity: 'info',
      description: verificationData.isVerified
        ? `Car verified by admin. Notes: ${verificationData.verificationNotes || 'None'}`
        : 'Car verification revoked by admin',
      reportedBy: adminId,
      eventDate: new Date(),
      verifiedByIot: false,
    });

    return {
      carId: updatedCar.id,
      vin: updatedCar.vin,
      isVerified: updatedCar.isVerified,
      verifiedAt: updatedCar.verifiedAt,
      verificationNotes: updatedCar.verificationNotes,
      message: verificationData.isVerified
        ? 'Car verified successfully'
        : 'Car verification revoked',
    };
  }

  async getCarsAwaitingVerification(limit: number = 50) {
    const unverifiedCars = await db.query.cars.findMany({
      where: or(eq(cars.isVerified, false), sql`${cars.isVerified} IS NULL`),
      orderBy: desc(cars.createdAt),
      limit,
      with: {
        carOwners: {
          where: eq(carOwners.isCurrent, true),
          with: {
            user: {
              columns: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        events: {
          where: eq(carEvents.eventType, 'mileage_tampering'),
        },
      },
    });

    return unverifiedCars.map(car => ({
      id: car.id,
      vin: car.vin,
      make: car.make,
      model: car.model,
      year: car.year,
      riskScore: car.riskScore,
      currentMileage: car.currentMileage,
      status: car.status,
      createdAt: car.createdAt,
      currentOwner: car.carOwners[0]?.user || null,
      tamperingIncidents: car.events.length,
      priority: car.riskScore > 70 ? 'high' : car.riskScore > 40 ? 'medium' : 'low',
    }));
  }

  async getVerificationStats() {
    const [totalCars, verifiedCars, pendingCars, rejectedCars] = await Promise.all([
      db.select({ count: count() }).from(cars),
      db.select({ count: count() }).from(cars).where(eq(cars.isVerified, true)),
      db
        .select({ count: count() })
        .from(cars)
        .where(or(eq(cars.isVerified, false), sql`${cars.isVerified} IS NULL`)),
      db
        .select({ count: count() })
        .from(cars)
        .where(and(eq(cars.isVerified, false), sql`${cars.verifiedAt} IS NOT NULL`)),
    ]);

    const verificationRate = (verifiedCars[0].count / Math.max(totalCars[0].count, 1)) * 100;

    const recentVerifications = await db.query.carEvents.findMany({
      where: eq(carEvents.eventType, 'admin_verification'),
      orderBy: desc(carEvents.eventDate),
      limit: 10,
      with: {
        car: {
          columns: { vin: true, make: true, model: true },
        },
      },
    });

    return {
      totals: {
        allCars: totalCars[0].count,
        verified: verifiedCars[0].count,
        pendingVerification: pendingCars[0].count,
        rejected: rejectedCars[0].count,
      },
      rates: {
        verificationRate: verificationRate.toFixed(2) + '%',
        pendingRate:
          ((pendingCars[0].count / Math.max(totalCars[0].count, 1)) * 100).toFixed(2) + '%',
      },
      recentActivity: recentVerifications.map(v => ({
        carVin: v.car.vin,
        carInfo: `${v.car.make} ${v.car.model}`,
        action: v.description,
        date: v.eventDate,
      })),
    };
  }

  async getRecentActivity(limitMinutes: number = 60) {
    const timeThreshold = new Date(Date.now() - limitMinutes * 60 * 1000);

    const [recentChecks, recentEvents, recentRegistrations] = await Promise.all([
      db.query.vehicleChecks.findMany({
        where: gte(vehicleChecks.createdAt, timeThreshold),
        orderBy: desc(vehicleChecks.createdAt),
        with: {
          user: {
            columns: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      db.query.carEvents.findMany({
        where: gte(carEvents.createdAt, timeThreshold),
        orderBy: desc(carEvents.createdAt),
        with: {
          car: {
            columns: { vin: true, make: true, model: true },
          },
        },
      }),
      db.query.users.findMany({
        where: gte(users.createdAt, timeThreshold),
        orderBy: desc(users.createdAt),
      }),
    ]);

    return {
      timeWindow: `Last ${limitMinutes} minutes`,
      summary: {
        newUsers: recentRegistrations.length,
        checksPerformed: recentChecks.length,
        eventsReported: recentEvents.length,
        totalActivity: recentRegistrations.length + recentChecks.length + recentEvents.length,
      },
      details: {
        recentChecks: recentChecks.slice(0, 10),
        recentEvents: recentEvents.slice(0, 10),
        newUsers: recentRegistrations,
      },
    };
  }
}
