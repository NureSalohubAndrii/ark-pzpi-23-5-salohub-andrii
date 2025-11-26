import { Router } from 'express';
import { CarsController } from './cars.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new CarsController();

router.post('/', authenticate, controller.createCar);
router.get('/vin/:vin', controller.getCarByVIN);
router.patch('/:id', authenticate, controller.updateCar);

/**
 * @swagger
 * tags:
 *   - name: Cars
 *     description: Vehicle management, VIN lookup, ownership history, mileage tampering detection
 */

/**
 * @swagger
 * /api/cars:
 *   post:
 *     summary: Add a new vehicle (for sale or personal use)
 *     description: |
 *       Registers a new car in the system. Automatically creates ownership record.
 *       Validates VIN format and checks for duplicates.
 *       Only authenticated users can add cars.
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vin
 *               - make
 *               - model
 *               - year
 *             properties:
 *               vin:
 *                 type: string
 *                 pattern: ^[A-HJ-NPR-Z0-9]{17}$
 *                 example: WF0AXXTTRALS12345
 *                 description: 17-character VIN (uppercase recommended)
 *               make:
 *                 type: string
 *                 example: Toyota
 *               model:
 *                 type: string
 *                 example: Camry
 *               year:
 *                 type: integer
 *                 minimum: 1886
 *                 maximum: 2026
 *                 example: 2021
 *               color:
 *                 type: string
 *                 example: Pearl White
 *               engineType:
 *                 type: string
 *                 example: 2.5L Hybrid
 *               transmission:
 *                 type: string
 *                 enum: [manual, automatic, cvt, dual-clutch]
 *               fuelType:
 *                 type: string
 *                 enum: [petrol, diesel, hybrid, electric, lpg, hydrogen]
 *               currentMileage:
 *                 type: integer
 *                 minimum: 0
 *                 example: 82340
 *               mileageUnit:
 *                 type: string
 *                 enum: [km, mi]
 *                 default: km
 *               ownershipDocumentUrl:
 *                 type: string
 *                 format: uri
 *                 description: Link to photo/scan of registration certificate
 *               description:
 *                 type: string
 *                 example: One owner, full Toyota service history, winter tires included
 *     responses:
 *       201:
 *         description: Vehicle successfully added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarResponse'
 *       400:
 *         description: Invalid VIN, duplicate VIN, or validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/cars/vin/{vin}:
 *   get:
 *     summary: Public vehicle lookup by VIN
 *     description: |
 *       **Public endpoint** — no authentication required.
 *       Returns full vehicle profile: specs, current mileage, risk score, ownership history.
 *       Used on landing page and in reports.
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: vin
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[A-HJ-NPR-Z0-9]{17}$
 *         description: 17-character VIN (case-insensitive)
 *         example: WF0AXXTTRALS12345
 *     responses:
 *       200:
 *         description: Vehicle found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicCarProfile'
 *       404:
 *         description: Vehicle not found
 *       400:
 *         description: Invalid VIN format
 */

/**
 * @swagger
 * /api/cars/{id}:
 *   patch:
 *     summary: Update vehicle information (owner only)
 *     description: |
 *       Only the current owner can update their car.
 *       If new mileage is lower than previous → **mileage tampering detected automatically** → risk score increases.
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentMileage:
 *                 type: integer
 *                 minimum: 0
 *                 example: 98765
 *                 description: New odometer reading
 *               description:
 *                 type: string
 *                 example: New summer tires, oil changed
 *               color:
 *                 type: string
 *                 example: Midnight Black
 *               ownershipDocumentUrl:
 *                 type: string
 *                 format: uri
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Vehicle updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarResponse'
 *       400:
 *         description: Mileage rollback detected or invalid data
 *       403:
 *         description: You are not the current owner
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Car:
 *       type: object
 *       required:
 *         - id
 *         - vin
 *         - make
 *         - model
 *         - year
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         vin:
 *           type: string
 *           pattern: ^[A-HJ-NPR-Z0-9]{17}$
 *         make:
 *           type: string
 *         model:
 *           type: string
 *         year:
 *           type: integer
 *         color:
 *           type: string
 *           nullable: true
 *         engineType:
 *           type: string
 *           nullable: true
 *         transmission:
 *           type: string
 *           nullable: true
 *         fuelType:
 *           type: string
 *           nullable: true
 *         currentMileage:
 *           type: integer
 *           nullable: true
 *         mileageUnit:
 *           type: string
 *           enum: [km, mi]
 *           default: km
 *         description:
 *           type: string
 *           nullable: true
 *         ownershipDocumentUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         riskScore:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: 0–30 low, 31–70 medium, 71–100 high risk
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     PublicCarProfile:
 *       type: object
 *       allOf:
 *         - $ref: '#/components/schemas/Car'
 *         - type: object
 *           properties:
 *             carOwners:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   isCurrent:
 *                     type: boolean
 *                   startedAt:
 *                     type: string
 *                     format: date-time
 *                   endedAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   startedMileage:
 *                     type: integer
 *                     nullable: true
 *
 *     CarResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Car'
 *         message:
 *           type: string
 *           example: "Car created successfully"
 */

export default router;
