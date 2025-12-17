import { eq, and, sql, desc, gte, lte, count } from 'drizzle-orm';
import { db } from '../../database';
import { cars, carEvents, carOwners, vehicleChecks, users } from '../../database/schema';

export class AnalyticsService {
  async detectMileageAnomalies(carId: string) {
    const events = await db.query.carEvents.findMany({
      where: and(eq(carEvents.carId, carId), sql`${carEvents.mileage} IS NOT NULL`),
      orderBy: carEvents.eventDate,
    });

    if (events.length < 3) {
      return { anomalies: [], message: 'Not enough data for analysis' };
    }

    const differences: number[] = [];
    const timeDifferences: number[] = [];

    for (let i = 1; i < events.length; i++) {
      const mileageDiff = events[i].mileage! - events[i - 1].mileage!;
      const timeDiff = events[i].eventDate.getTime() - events[i - 1].eventDate.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      differences.push(mileageDiff);
      timeDifferences.push(daysDiff);
    }

    const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance =
      differences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / differences.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = [];
    const zScoreThreshold = 2;

    for (let i = 0; i < differences.length; i++) {
      const zScore = (differences[i] - mean) / stdDev;

      if (Math.abs(zScore) > zScoreThreshold) {
        const dailyMileage = differences[i] / timeDifferences[i];

        anomalies.push({
          eventIndex: i + 1,
          date: events[i + 1].eventDate,
          mileageDifference: differences[i],
          daysElapsed: Math.round(timeDifferences[i]),
          dailyMileage: Math.round(dailyMileage),
          zScore: zScore.toFixed(2),
          severity: Math.abs(zScore) > 3 ? 'critical' : 'high',
          type: differences[i] < 0 ? 'rollback' : 'unusually_high',
          description:
            differences[i] < 0
              ? `Mileage decreased by ${Math.abs(differences[i])} km`
              : `Abnormally high mileage: ${differences[i]} km in ${Math.round(timeDifferences[i])} days (${Math.round(dailyMileage)} km/day)`,
        });
      }
    }

    return {
      anomalies,
      statistics: {
        totalDataPoints: events.length,
        meanMileageChange: Math.round(mean),
        standardDeviation: Math.round(stdDev),
        analysisMethod: 'Z-Score (standard deviation)',
      },
    };
  }

  async predictFutureMileage(carId: string, daysAhead: number = 365) {
    const events = await db.query.carEvents.findMany({
      where: and(eq(carEvents.carId, carId), sql`${carEvents.mileage} IS NOT NULL`),
      orderBy: carEvents.eventDate,
    });

    if (events.length < 2) {
      return { error: 'Not enough historical data' };
    }

    const firstDate = events[0].eventDate.getTime();
    const dataPoints = events.map(e => ({
      x: (e.eventDate.getTime() - firstDate) / (1000 * 60 * 60 * 24),
      y: e.mileage!,
    }));

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastDataPoint = dataPoints[dataPoints.length - 1];
    const futureX = lastDataPoint.x + daysAhead;
    const predictedMileage = slope * futureX + intercept;

    const meanY = sumY / n;
    const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = dataPoints.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = 1 - ssResidual / ssTotal;

    return {
      currentMileage: lastDataPoint.y,
      predictedMileage: Math.round(predictedMileage),
      daysAhead,
      dailyMileageRate: Math.round(slope),
      annualMileageRate: Math.round(slope * 365),
      confidence: {
        rSquared: rSquared.toFixed(4),
        interpretation:
          rSquared > 0.9 ? 'High accuracy' : rSquared > 0.7 ? 'Moderate accuracy' : 'Low accuracy',
      },
      dataPointsUsed: n,
      model: {
        equation: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`,
        slope: slope.toFixed(2),
        intercept: intercept.toFixed(2),
      },
    };
  }

  async getGlobalSystemAnalytics(startDate?: Date, endDate?: Date) {
    const dateFilter =
      startDate && endDate
        ? and(gte(vehicleChecks.createdAt, startDate), lte(vehicleChecks.createdAt, endDate))
        : undefined;

    const [totalUsers, totalCars, totalChecks, totalEvents, riskDistribution] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(cars),
      db.select({ count: count() }).from(vehicleChecks).where(dateFilter),
      db.select({ count: count() }).from(carEvents),
      db
        .select({
          riskLevel: cars.riskLevel,
          count: count(),
        })
        .from(cars)
        .groupBy(cars.riskLevel),
    ]);

    const eventsByType = await db
      .select({
        eventType: carEvents.eventType,
        count: count(),
      })
      .from(carEvents)
      .groupBy(carEvents.eventType);

    const checksByType = await db
      .select({
        checkType: vehicleChecks.checkType,
        count: count(),
      })
      .from(vehicleChecks)
      .where(dateFilter)
      .groupBy(vehicleChecks.checkType);

    const avgRisk = await db
      .select({
        avg: sql<number>`AVG(${cars.riskScore})`,
      })
      .from(cars);

    return {
      period: {
        startDate: startDate?.toISOString() || 'All time',
        endDate: endDate?.toISOString() || 'Present',
      },
      totals: {
        users: totalUsers[0].count,
        cars: totalCars[0].count,
        checks: totalChecks[0].count,
        events: totalEvents[0].count,
      },
      riskAnalysis: {
        distribution: riskDistribution,
        averageRiskScore: Math.round(Number(avgRisk[0].avg) || 0),
      },
      eventBreakdown: eventsByType,
      checkTypeBreakdown: checksByType,
      generatedAt: new Date(),
    };
  }

  async getUserBehaviorAnalytics(userId: string) {
    const [checksHistory, userCars, userEvents] = await Promise.all([
      db.query.vehicleChecks.findMany({
        where: eq(vehicleChecks.userId, userId),
        orderBy: desc(vehicleChecks.createdAt),
      }),
      db.query.carOwners.findMany({
        where: eq(carOwners.userId, userId),
        with: { car: true },
      }),
      db.query.carEvents.findMany({
        where: eq(carEvents.reportedBy, userId),
      }),
    ]);

    const checksPerMonth: Record<string, number> = {};
    checksHistory.forEach(check => {
      const month = check.createdAt.toISOString().substring(0, 7);
      checksPerMonth[month] = (checksPerMonth[month] || 0) + 1;
    });

    const ownershipDurations = userCars
      .filter(o => o.endedAt)
      .map(o => {
        const start = new Date(o.startedAt).getTime();
        const end = new Date(o.endedAt!).getTime();
        return (end - start) / (1000 * 60 * 60 * 24); // days
      });

    const avgOwnership =
      ownershipDurations.length > 0
        ? ownershipDurations.reduce((a, b) => a + b, 0) / ownershipDurations.length
        : 0;

    return {
      userId,
      checkActivity: {
        totalChecks: checksHistory.length,
        checksByMonth: checksPerMonth,
        mostFrequentCheckType: this.getMostFrequent(checksHistory.map(c => c.checkType)),
      },
      ownershipPatterns: {
        totalCarsOwned: userCars.length,
        currentCars: userCars.filter(o => o.isCurrent).length,
        averageOwnershipDays: Math.round(avgOwnership),
      },
      contributionActivity: {
        eventsReported: userEvents.length,
        eventTypes: this.getMostFrequent(userEvents.map(e => e.eventType)),
      },
    };
  }

  async getHighRiskCarsReport(limit: number = 20) {
    const highRiskCars = await db.query.cars.findMany({
      where: gte(cars.riskScore, 60),
      orderBy: desc(cars.riskScore),
      limit,
      with: {
        carOwners: {
          where: eq(carOwners.isCurrent, true),
        },
        events: {
          where: eq(carEvents.eventType, 'mileage_tampering'),
        },
      },
    });

    return highRiskCars.map(car => ({
      vin: car.vin,
      make: car.make,
      model: car.model,
      year: car.year,
      riskScore: car.riskScore,
      riskLevel: car.riskLevel,
      status: car.status,
      currentMileage: car.currentMileage,
      hasCurrentOwner: car.carOwners.length > 0,
      tamperingIncidents: car.events.length,
      recommendation: car.riskScore >= 90 ? 'BLOCK IMMEDIATELY' : 'REQUIRES VERIFICATION',
    }));
  }

  private getMostFrequent(arr: string[]): string | null {
    if (arr.length === 0) return null;
    const freq: Record<string, number> = {};
    arr.forEach(item => {
      freq[item] = (freq[item] || 0) + 1;
    });
    return Object.keys(freq).reduce((a, b) => (freq[a] > freq[b] ? a : b));
  }
}
