import { db } from '../../database';
import { vehicleChecks } from '../../database/schema';
import { CarsService } from '../cars/cars.service';

const carsService = new CarsService();

export class ReportsService {
  async generateReport(
    vin: string,
    userId: string,
    checkType: 'basic' | 'extended' | 'premium' = 'basic'
  ) {
    const vinUpper = vin.toUpperCase();
    const fullReport = await carsService.getCarReport(vinUpper);

    await db.insert(vehicleChecks).values({
      userId,
      carId: fullReport.car.id,
      vin: vinUpper,
      checkType,
      price: '0',
      paymentStatus: 'free',
    });

    let filteredReport: any = { ...fullReport };

    if (checkType === 'basic') {
      filteredReport = {
        car: {
          vin: fullReport.car.vin,
          make: fullReport.car.make,
          model: fullReport.car.model,
          year: fullReport.car.year,
          color: fullReport.car.color,
          currentMileage: fullReport.car.currentMileage,
          riskScore: fullReport.car.riskScore,
          riskLevel: fullReport.car.riskLevel,
        },
        events: fullReport.events
          .filter((e: any) => ['accident', 'mileage_tampering'].includes(e.eventType))
          .slice(0, 5),
        owners: [],
      };
    } else if (checkType === 'extended' || checkType === 'premium') {
      filteredReport.owners = fullReport.owners.map((o: any) => ({
        startedAt: o.startedAt,
        endedAt: o.endedAt,
        isCurrent: o.isCurrent,
      }));
    }

    return {
      reportType: checkType,
      generatedAt: new Date().toISOString(),
      ...filteredReport,
      recommendations: this.generateRecommendations(fullReport),
    };
  }

  private generateRecommendations(report: any) {
    const recs: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; message: string }> = [];

    const riskScore = report.car?.riskScore ?? 0;
    const events = report.events ?? [];

    const hasTampering = events.some((e: any) => e.eventType === 'mileage_tampering');
    const hasAccidents = events.some(
      (e: any) => e.eventType === 'accident' && e.severity === 'high'
    );

    if (riskScore >= 90 || hasTampering) {
      recs.push({
        severity: 'critical',
        message: 'DO NOT BUY: Mileage tampering or critical risk detected',
      });
    } else if (riskScore >= 60 || hasAccidents) {
      recs.push({
        severity: 'high',
        message: 'High risk. Professional inspection required',
      });
    } else if (riskScore >= 30) {
      recs.push({
        severity: 'medium',
        message: 'Moderate risk. Check history carefully',
      });
    } else {
      recs.push({
        severity: 'low',
        message: 'No major issues found. Vehicle appears clean',
      });
    }

    return recs;
  }
}
