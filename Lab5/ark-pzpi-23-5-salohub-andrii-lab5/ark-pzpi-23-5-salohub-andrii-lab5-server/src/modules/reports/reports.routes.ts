import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new ReportsController();

router.get('/:vin', authenticate, controller.generateReport);

/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Vehicle history reports with risk analysis and recommendations
 */

/**
 * @swagger
 * /api/reports/{vin}:
 *   get:
 *     summary: Generate vehicle history report
 *     description: |
 *       Generates a detailed vehicle report by VIN.
 *       Currently all report types are **free**.
 *       Includes automatic risk assessment and purchase recommendations.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[A-HJ-NPR-Z0-9]{17}$
 *         description: 17-character VIN (case-insensitive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [basic, extended, premium]
 *           default: basic
 *         description: |
 *           Report detail level:
 *           - `basic` — summary + critical events
 *           - `extended` — + telemetry + ownership history
 *           - `premium` — full report (currently same as extended)
 *     responses:
 *       200:
 *         description: Vehicle report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportType:
 *                   type: string
 *                   enum: [basic, extended, premium]
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 car:
 *                   $ref: '#/components/schemas/Car'
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CarEvent'
 *                 owners:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recentTelemetry:
 *                   type: array
 *                   items:
 *                     type: object
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       message:
 *                         type: string
 *                     example:
 *                       - severity: critical
 *                         message: "DO NOT BUY: Mileage tampering detected"
 *       404:
 *         description: Vehicle not found
 *       400:
 *         description: Invalid VIN
 */

export default router;
