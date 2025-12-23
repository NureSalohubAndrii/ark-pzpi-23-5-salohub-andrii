import { Router } from 'express';
import { IoTController } from './iot.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new IoTController();

router.get('/sync/:vin', controller.syncDevice);
router.post('/telemetry', controller.receiveTelemetry);
router.get('/telemetry/:vin/history', authenticate, controller.getTelemetryHistory);
router.get('/telemetry/:vin/latest', authenticate, controller.getLatestTelemetry);
router.get('/telemetry/:vin/stats', authenticate, controller.getTelemetryStats);
router.get('/telemetry/:vin/tampering', authenticate, controller.getTamperingHistory);
router.get('/config/:vin', authenticate, controller.getDeviceConfig);
router.patch('/config/:vin', authenticate, controller.updateDeviceConfig);

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
 *     description: Called by the IoT device on startup/power-on to retrieve current vehicle data, latest mileage, and configuration.
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle Identification Number (VIN)
 *     responses:
 *       200:
 *         description: Device synchronized successfully
 *       404:
 *         description: Car with specified VIN not found
 */

/**
 * @swagger
 * /api/iot/telemetry:
 *   post:
 *     summary: Receive telemetry data from IoT device
 *     description: Endpoint for IoT devices to send sensor readings. Detects mileage tampering but does NOT block subsequent legitimate data. Events are created once per detection period.
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
 *                 type: number
 *                 example: 45230
 *               fuelLevel:
 *                 type: number
 *                 nullable: true
 *                 example: 67.5
 *               humidity:
 *                 type: number
 *                 nullable: true
 *                 example: 45.2
 *               batteryVoltage:
 *                 type: number
 *                 nullable: true
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
 *         description: Telemetry processed successfully (even if tampering detected)
 *       400:
 *         description: Invalid data format
 *       404:
 *         description: Car with specified VIN not found
 */

/**
 * @swagger
 * /api/iot/telemetry/{vin}/history:
 *   get:
 *     summary: Get telemetry history for a vehicle
 *     description: Returns the most recent telemetry records for the specified vehicle.
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: Telemetry history retrieved successfully
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/iot/telemetry/{vin}/latest:
 *   get:
 *     summary: Get the latest telemetry data
 *     description: Returns the most recent telemetry reading and indicates whether the IoT device is currently online (last update within the last hour).
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *     responses:
 *       200:
 *         description: Latest telemetry data
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/iot/telemetry/{vin}/stats:
 *   get:
 *     summary: Get telemetry statistics for a period
 *     description: Provides aggregated statistics (total mileage, average daily mileage, engine starts, etc.) based on IoT data over the specified number of days.
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of past days to analyze
 *     responses:
 *       200:
 *         description: Telemetry statistics
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/iot/telemetry/{vin}/tampering:
 *   get:
 *     summary: Get mileage tampering history
 *     description: Returns all detected mileage tampering events for the specified vehicle, including rollbacks, suspicious increases, and unrealistic spikes.
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *     responses:
 *       200:
 *         description: Tampering history retrieved successfully
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
 *                     vin:
 *                       type: string
 *                     totalTamperingEvents:
 *                       type: integer
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           severity:
 *                             type: string
 *                             enum: [high, critical]
 *                           description:
 *                             type: string
 *                           mileage:
 *                             type: number
 *                           verifiedByIot:
 *                             type: boolean
 *                           eventDate:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/iot/config/{vin}:
 *   get:
 *     summary: Get IoT device configuration
 *     description: Returns current configuration parameters for the IoT device installed on the vehicle.
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *     responses:
 *       200:
 *         description: Device configuration retrieved successfully
 *       404:
 *         description: Car or IoT config not found
 */

/**
 * @swagger
 * /api/iot/config/{vin}:
 *   patch:
 *     summary: Update IoT device configuration
 *     description: Allows authorized users to update reporting intervals, thresholds, smoothing factors, and enable/disable the device.
 *     tags: [IoT]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle VIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activeInterval:
 *                 type: integer
 *                 description: Reporting interval in seconds when engine is running
 *               idleInterval:
 *                 type: integer
 *                 description: Reporting interval in seconds when engine is off
 *               batteryLowThreshold:
 *                 type: number
 *                 description: Voltage threshold (in volts) for low battery alert (e.g., 11.8)
 *               fuelLowThreshold:
 *                 type: number
 *                 description: Fuel level percentage for low fuel alert
 *               humidityHighThreshold:
 *                 type: number
 *                 description: Humidity percentage for leak suspicion alert
 *               smoothingAlphaFuel:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Exponential smoothing factor for fuel level (0 = no smoothing, 1 = heavy)
 *               smoothingAlphaBattery:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Exponential smoothing factor for battery voltage
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable IoT data collection
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       404:
 *         description: Car not found or device needs to sync first
 */

export default router;
