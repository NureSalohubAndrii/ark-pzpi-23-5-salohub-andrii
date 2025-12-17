import { Router } from 'express';
import { IoTController } from './iot.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new IoTController();

/**
 * @swagger
 * tags:
 *   - name: IoT
 *     description: IoT device integration and telemetry
 */

/**
 * @swagger
 * /api/iot/sync/{vin}:
 *   get:
 *     summary: Sync IoT device with server
 *     description: IoT device retrieves current car data on startup
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *     responses:
 *       200:
 *         description: Sync successful
 *       404:
 *         description: Car not found
 */
router.get('/sync/:vin', controller.syncDevice);

/**
 * @swagger
 * /api/iot/telemetry:
 *   post:
 *     summary: Receive telemetry from IoT device
 *     description: IoT device sends sensor data (mileage, fuel, humidity, battery)
 *     tags: [IoT]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vin
 *               - mileage
 *               - engineRunning
 *               - eventType
 *             properties:
 *               vin:
 *                 type: string
 *                 example: "1HGBH41JXMN109186"
 *               mileage:
 *                 type: integer
 *                 example: 45230
 *               fuelLevel:
 *                 type: number
 *                 example: 67.5
 *               humidity:
 *                 type: number
 *                 example: 45.2
 *               batteryVoltage:
 *                 type: number
 *                 example: 12.6
 *               engineRunning:
 *                 type: boolean
 *                 example: true
 *               eventType:
 *                 type: string
 *                 enum: [periodic, engine_start, engine_stop]
 *                 example: "periodic"
 *     responses:
 *       200:
 *         description: Telemetry received successfully
 *       400:
 *         description: Mileage tampering detected or invalid data
 *       404:
 *         description: Car not found
 */
router.post('/telemetry', controller.receiveTelemetry);

/**
 * @swagger
 * /api/iot/telemetry/{vin}/history:
 *   get:
 *     summary: Get telemetry history
 *     description: Returns historical IoT data for a vehicle
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Telemetry history
 */
router.get('/telemetry/:vin/history', authenticate, controller.getTelemetryHistory);

/**
 * @swagger
 * /api/iot/telemetry/{vin}/latest:
 *   get:
 *     summary: Get latest telemetry data
 *     description: Returns most recent IoT readings for dashboard
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest telemetry data
 */
router.get('/telemetry/:vin/latest', authenticate, controller.getLatestTelemetry);

/**
 * @swagger
 * /api/iot/telemetry/{vin}/stats:
 *   get:
 *     summary: Get telemetry statistics
 *     description: Returns aggregated IoT statistics for a period
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Telemetry statistics
 */
router.get('/telemetry/:vin/stats', authenticate, controller.getTelemetryStats);

export default router;
