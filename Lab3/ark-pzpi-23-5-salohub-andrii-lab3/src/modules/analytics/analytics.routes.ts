import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);

router.get('/cars/:carId/mileage-anomalies', controller.getMileageAnomalies);
router.get('/cars/:carId/predict-mileage', controller.predictMileage);
router.get('/system', controller.getSystemAnalytics);
router.get('/users/:userId/behavior', controller.getUserBehavior);
router.get('/high-risk-cars', controller.getHighRiskCars);

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: Advanced analytics for car depreciation, mileage predictions, anomaly detection, and system reports
 */

/**
 * @swagger
 * /api/analytics/cars/{carId}/mileage-anomalies:
 *   get:
 *     summary: Detect mileage anomalies
 *     description: Uses statistical analysis (Z-score) to detect unusual mileage changes, including potential rollbacks or tampering
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *         description: Car ID
 *     responses:
 *       200:
 *         description: Mileage analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     anomalies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           eventIndex:
 *                             type: number
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           mileageDifference:
 *                             type: number
 *                           daysElapsed:
 *                             type: number
 *                           dailyMileage:
 *                             type: number
 *                           zScore:
 *                             type: string
 *                           severity:
 *                             type: string
 *                             enum: [high, critical]
 *                           type:
 *                             type: string
 *                             enum: [rollback, unusually_high]
 *                           description:
 *                             type: string
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalDataPoints:
 *                           type: number
 *                         meanMileageChange:
 *                           type: number
 *                         standardDeviation:
 *                           type: number
 *                         analysisMethod:
 *                           type: string
 *                     message:
 *                       type: string
 *                       nullable: true
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/analytics/cars/{carId}/predict-mileage:
 *   get:
 *     summary: Predict future mileage
 *     description: Uses linear regression to predict future mileage based on historical data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *         description: Car ID
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 365
 *           minimum: 1
 *           maximum: 3650
 *         description: Number of days to predict ahead (max 10 years)
 *     responses:
 *       200:
 *         description: Mileage prediction calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentMileage:
 *                       type: number
 *                     predictedMileage:
 *                       type: number
 *                     daysAhead:
 *                       type: number
 *                     dailyMileageRate:
 *                       type: number
 *                     annualMileageRate:
 *                       type: number
 *                     confidence:
 *                       type: object
 *                       properties:
 *                         rSquared:
 *                           type: string
 *                         interpretation:
 *                           type: string
 *                           enum: [High accuracy, Moderate accuracy, Low accuracy]
 *                     dataPointsUsed:
 *                       type: number
 *                     model:
 *                       type: object
 *                       properties:
 *                         equation:
 *                           type: string
 *                         slope:
 *                           type: string
 *                         intercept:
 *                           type: string
 *       400:
 *         description: Invalid parameters or insufficient data
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/analytics/system:
 *   get:
 *     summary: Get global system analytics
 *     description: Provides comprehensive system-wide statistics including users, cars, checks, events, and risk analysis
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter end date (ISO 8601)
 *     responses:
 *       200:
 *         description: System analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                     totals:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: number
 *                         cars:
 *                           type: number
 *                         checks:
 *                           type: number
 *                         events:
 *                           type: number
 *                     riskAnalysis:
 *                       type: object
 *                       properties:
 *                         distribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               riskLevel:
 *                                 type: string
 *                               count:
 *                                 type: number
 *                         averageRiskScore:
 *                           type: number
 *                     eventBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           eventType:
 *                             type: string
 *                           count:
 *                             type: number
 *                     checkTypeBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           checkType:
 *                             type: string
 *                           count:
 *                             type: number
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid date parameters
 */

/**
 * @swagger
 * /api/analytics/users/{userId}/behavior:
 *   get:
 *     summary: Get user behavior analytics
 *     description: Analyzes user activity patterns including checks, ownership history, and contributions
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User behavior analytics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     checkActivity:
 *                       type: object
 *                       properties:
 *                         totalChecks:
 *                           type: number
 *                         checksByMonth:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                         mostFrequentCheckType:
 *                           type: string
 *                           nullable: true
 *                     ownershipPatterns:
 *                       type: object
 *                       properties:
 *                         totalCarsOwned:
 *                           type: number
 *                         currentCars:
 *                           type: number
 *                         averageOwnershipDays:
 *                           type: number
 *                     contributionActivity:
 *                       type: object
 *                       properties:
 *                         eventsReported:
 *                           type: number
 *                         eventTypes:
 *                           type: string
 *                           nullable: true
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/analytics/high-risk-cars:
 *   get:
 *     summary: Get high-risk cars report
 *     description: Returns a list of cars with risk scores >= 60, ordered by risk score
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: High-risk cars retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vin:
 *                         type: string
 *                       make:
 *                         type: string
 *                       model:
 *                         type: string
 *                       year:
 *                         type: number
 *                       riskScore:
 *                         type: number
 *                       riskLevel:
 *                         type: string
 *                       status:
 *                         type: string
 *                       currentMileage:
 *                         type: number
 *                         nullable: true
 *                       hasCurrentOwner:
 *                         type: boolean
 *                       tamperingIncidents:
 *                         type: number
 *                       recommendation:
 *                         type: string
 *                         enum: [BLOCK IMMEDIATELY, REQUIRES VERIFICATION]
 *       400:
 *         description: Invalid limit parameter
 */

export default router;
