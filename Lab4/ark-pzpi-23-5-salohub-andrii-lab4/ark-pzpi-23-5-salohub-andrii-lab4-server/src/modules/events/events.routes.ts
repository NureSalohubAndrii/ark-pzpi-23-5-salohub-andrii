import { Router } from 'express';
import { EventsController } from './events.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new EventsController();

router.post('/', authenticate, controller.createEvent);
router.get('/car/:carId', controller.getCarEvents);
router.put('/:eventId', authenticate, controller.updateEvent);
router.delete('/:eventId', authenticate, controller.deleteEvent);

/**
 * @swagger
 * tags:
 *   - name: Events
 *     description: Vehicle history events — accidents, services, inspections, mileage updates, and fraud detection
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CarEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         carId:
 *           type: string
 *           format: uuid
 *         eventType:
 *           type: string
 *           enum: [accident, service, inspection, repair, mileage_update, sale, mileage_tampering, other]
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         mileage:
 *           type: integer
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 *         cost:
 *           type: string
 *           nullable: true
 *         verifiedByIot:
 *           type: boolean
 *           default: false
 *         documentUrl:
 *           type: string
 *           nullable: true
 *         reportedBy:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         eventDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - carId
 *         - eventType
 *         - eventDate
 *         - createdAt
 *         - updatedAt
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new vehicle event
 *     description: |
 *       Add a new event to the vehicle's history.
 *       If mileage is provided and lower than previous records → **mileage tampering detected automatically**.
 *       This will create a `mileage_tampering` event and increase risk score.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carId
 *               - eventType
 *               - eventDate
 *             properties:
 *               carId:
 *                 type: string
 *                 format: uuid
 *                 description: Vehicle ID
 *               eventType:
 *                 type: string
 *                 enum: [accident, service, inspection, repair, mileage_update, sale, other]
 *                 example: accident
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 example: high
 *               description:
 *                 type: string
 *                 example: Rear-end collision at highway, airbag deployed
 *               mileage:
 *                 type: integer
 *                 minimum: 0
 *                 example: 158000
 *                 description: Odometer reading at the time of event (triggers tampering check)
 *               location:
 *                 type: string
 *                 example: Kyiv, Ukraine
 *               cost:
 *                 type: string
 *                 pattern: ^\d+(\.\d{1,2})?$
 *                 example: "2500.00"
 *                 description: Repair cost in USD
 *               documentUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://storage.example.com/accidents/report-123.pdf
 *               eventDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-03-15T10:30:00Z"
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarEvent'
 *       400:
 *         description: Mileage tampering detected or invalid data
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               error: "Mileage tampering detected! Car status updated."
 *       403:
 *         description: Not authorized to add events for this vehicle
 */

/**
 * @swagger
 * /api/events/car/{carId}:
 *   get:
 *     summary: Get all events for a vehicle
 *     description: Returns complete history with filtering support
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Vehicle ID
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [accident, service, mileage_tampering, inspection]
 *         description: Filter by event type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date (e.g., 2024-01-01T00:00:00Z)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CarEvent'
 */

/**
 * @swagger
 * /api/events/{eventId}:
 *   put:
 *     summary: Update an existing event
 *     description: Only allowed for events created by the current user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               cost:
 *                 type: string
 *               documentUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarEvent'
 *       404:
 *         description: Event not found
 *
 *   delete:
 *     summary: Delete an event
 *     description: Removes event and recalculates vehicle risk score
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Event deleted successfully"
 *       404:
 *         description: Event not found
 */

export default router;
