import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new UsersController();

router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, controller.updateProfile);
router.get('/my-cars', authenticate, controller.getMyCars);
router.get('/my-cars/history', authenticate, controller.getMyCarHistory);
router.get('/check-history', authenticate, controller.getMyCheckHistory);
router.get('/stats', authenticate, controller.getMyStats);
router.get('/:id', authenticate, controller.getUserById);

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User profile management, car ownership history, statistics and admin tools
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Returns authenticated user's personal information (excluding password)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update user profile
 *     description: Partially update first name and/or last name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Andrii
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Salohub
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid data
 */

/**
 * @swagger
 * /api/users/my-cars:
 *   get:
 *     summary: Get cars currently owned by user
 *     description: Returns list of vehicles where user is the current owner
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current cars
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Car'
 */

/**
 * @swagger
 * /api/users/my-cars/history:
 *   get:
 *     summary: Get complete car ownership history
 *     description: All cars user has ever owned, including past ownerships
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full ownership history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 allOf:
 *                   - $ref: '#/components/schemas/Car'
 *                   - type: object
 *                     properties:
 *                       ownership:
 *                         type: object
 *                         properties:
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                           endedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           isCurrent:
 *                             type: boolean
 */

/**
 * @swagger
 * /api/users/check-history:
 *   get:
 *     summary: Get user's VIN check history
 *     description: List of all vehicle reports user has requested
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of recent checks to return
 *     responses:
 *       200:
 *         description: Check history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VehicleCheck'
 */

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Summary of user's activity and ownership
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCarsOwned:
 *                   type: integer
 *                   example: 5
 *                 currentCarsOwned:
 *                   type: integer
 *                   example: 2
 *                 totalChecksPerformed:
 *                   type: integer
 *                   example: 47
 *                 memberSince:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00Z"
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin or self)
 *     description: Admin can view any user. Regular user can only view own profile.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Delete user account
 *     description: Permanently deletes user account. Not allowed if user currently owns any cars.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 message: "User deleted successfully"
 *       400:
 *         description: Cannot delete — user owns active vehicles
 */
router.delete('/account', authenticate, controller.deleteAccount);

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *           nullable: true
 *         lastName:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         isBlocked:
 *           type: boolean
 *         emailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - email
 *         - role
 *         - emailVerified
 *
 *     VehicleCheck:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         vin:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         car:
 *           $ref: '#/components/schemas/Car'
 *           nullable: true
 *         riskScore:
 *           type: integer
 *           nullable: true
 */

export default router;
