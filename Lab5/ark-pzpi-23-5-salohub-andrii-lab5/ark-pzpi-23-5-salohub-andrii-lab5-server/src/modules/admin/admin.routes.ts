import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireAdmin } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new AdminController();

router.use(authenticate, requireAdmin);

router.patch('/users/:userId/block', controller.blockUser);
router.patch('/users/:userId/unblock', controller.unblockUser);
router.post('/db/backup', controller.createBackup);
router.get('/db/analysis', controller.getDbStats);
router.post('/db/optimize', controller.optimizeDb);
router.get('/db/backups', controller.getBackups);
router.post('/db/restore', controller.restoreBackup);
router.delete('/db/backups', controller.deleteBackup);
router.get('/cars/awaiting-verification', controller.getCarsAwaitingVerification);
router.patch('/cars/:carId/verify', controller.verifyCar);
router.get('/verification-stats', controller.getVerificationStats);
router.get('/recent-activity', controller.getRecentActivity);

/**
 * @swagger
 * tags:
 *  - name: Admin
 *    description: Administrative operations including user management and database maintenance
 */

/**
 * @swagger
 * /api/admin/users/{userId}/block:
 *   patch:
 *     summary: Block a user account
 *     description: Permanently blocks a user account, preventing them from accessing the system
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to block
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for blocking the user (optional but recommended)
 *             required:
 *               - reason
 *     responses:
 *       200:
 *         description: User successfully blocked
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
 *                     status:
 *                       type: string
 *                       enum: [blocked]
 *                     reason:
 *                       type: string
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/admin/users/{userId}/unblock:
 *   patch:
 *     summary: Unblock a user account
 *     description: Restores access to a previously blocked user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to unblock
 *     responses:
 *       200:
 *         description: User successfully unblocked
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
 *                     status:
 *                       type: string
 *                       enum: [active]
 *                     message:
 *                       type: string
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/admin/db/backup:
 *   post:
 *     summary: Create a new database backup
 *     description: Creates a complete database backup using pg_dump and stores it in the local backups directory
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database backup created successfully
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
 *                     filename:
 *                       type: string
 *                     path:
 *                       type: string
 *                     size:
 *                       type: string
 *                     storageType:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Backup creation failed (requires postgresql-client to be installed)
 */

/**
 * @swagger
 * /api/admin/db/analysis:
 *   get:
 *     summary: Get database storage analysis
 *     description: Returns detailed analysis of database table sizes and their relative proportions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database storage analysis
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
 *                     stats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tableName:
 *                             type: string
 *                           rawBytes:
 *                             type: number
 *                           formattedSize:
 *                             type: string
 *                           percentage:
 *                             type: string
 *                     totalSize:
 *                       type: string
 */

/**
 * @swagger
 * /api/admin/db/optimize:
 *   post:
 *     summary: Perform database maintenance
 *     description: Executes VACUUM ANALYZE to optimize database storage and update query planner statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database maintenance completed successfully
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
 *                     status:
 *                       type: string
 *                     operation:
 *                       type: string
 *                     message:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/admin/db/backups:
 *   get:
 *     summary: Get list of available database backups
 *     description: Returns a list of all available backup files in the backup directory, sorted by creation time
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available backups
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
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/admin/db/restore:
 *   post:
 *     summary: Restore database from backup
 *     description: Restores the database from a specified backup file. This operation completely replaces the current database contents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Name of the backup file to restore from
 *     responses:
 *       200:
 *         description: Database successfully restored
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
 *                     message:
 *                       type: string
 *                     restoredFrom:
 *                       type: string
 *                     durationSeconds:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Filename is required
 *       404:
 *         description: Backup file not found
 *       500:
 *         description: Restore process failed
 */

/**
 * @swagger
 * /api/admin/db/backups:
 *   delete:
 *     summary: Delete a database backup file
 *     description: Permanently removes a specific backup file from the server's backup directory
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Exact name of the backup file to delete (e.g., backup-2025-12-13T10-30-00Z.sql)
 *     responses:
 *       200:
 *         description: Backup file deleted successfully
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
 *                     success:
 *                       type: boolean
 *                     filename:
 *                       type: string
 *                     message:
 *                       type: string
 *                     deletedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Filename is missing or invalid
 *       404:
 *         description: Backup file not found
 *       500:
 *         description: Failed to delete the backup file
 */

/**
 * @swagger
 * /api/admin/cars/awaiting-verification:
 *   get:
 *     summary: Get list of cars awaiting verification
 *     description: Returns a list of unverified cars (isVerified = false or NULL), including owner info and tampering incidents. Sorted by creation date (newest first).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of cars to return
 *     responses:
 *       200:
 *         description: List of cars awaiting verification
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
 *                       id:
 *                         type: string
 *                       vin:
 *                         type: string
 *                       make:
 *                         type: string
 *                       model:
 *                         type: string
 *                       year:
 *                         type: integer
 *                       riskScore:
 *                         type: number
 *                       currentMileage:
 *                         type: number
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       currentOwner:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                       tamperingIncidents:
 *                         type: integer
 *                       priority:
 *                         type: string
 *                         enum: [high, medium, low]
 */

/**
 * @swagger
 * /api/admin/cars/{carId}/verify:
 *   patch:
 *     summary: Verify or revoke verification of a car
 *     description: Admin manually verifies or revokes verification of a car. Creates corresponding event in carEvents table.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the car
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 description: true to verify, false to revoke
 *               verificationNotes:
 *                 type: string
 *                 nullable: true
 *                 description: Optional admin notes
 *     responses:
 *       200:
 *         description: Car verification status updated
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
 *                     carId:
 *                       type: string
 *                     vin:
 *                       type: string
 *                     isVerified:
 *                       type: boolean
 *                     verifiedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     verificationNotes:
 *                       type: string
 *                       nullable: true
 *                     message:
 *                       type: string
 *       404:
 *         description: Car not found
 */

/**
 * @swagger
 * /api/admin/verification-stats:
 *   get:
 *     summary: Get verification statistics
 *     description: Returns overall statistics on car verification status and recent admin verification activity.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification statistics
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
 *                     totals:
 *                       type: object
 *                       properties:
 *                         allCars:
 *                           type: integer
 *                         verified:
 *                           type: integer
 *                         pendingVerification:
 *                           type: integer
 *                         rejected:
 *                           type: integer
 *                     rates:
 *                       type: object
 *                       properties:
 *                         verificationRate:
 *                           type: string
 *                           example: "87.45%"
 *                         pendingRate:
 *                           type: string
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           carVin:
 *                             type: string
 *                           carInfo:
 *                             type: string
 *                           action:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 */

/**
 * @swagger
 * /api/admin/recent-activity:
 *   get:
 *     summary: Get recent system activity
 *     description: Returns summary of recent user registrations, vehicle checks, and car events within the specified time window (default 60 minutes).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limitMinutes
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Time window in minutes
 *     responses:
 *       200:
 *         description: Recent activity summary
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
 *                     timeWindow:
 *                       type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         newUsers:
 *                           type: integer
 *                         checksPerformed:
 *                           type: integer
 *                         eventsReported:
 *                           type: integer
 *                         totalActivity:
 *                           type: integer
 *                     details:
 *                       type: object
 *                       properties:
 *                         recentChecks:
 *                           type: array
 *                         recentEvents:
 *                           type: array
 *                         newUsers:
 *                           type: array
 */

export default router;
