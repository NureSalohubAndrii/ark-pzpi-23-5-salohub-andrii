import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/verify-email/:userId', controller.verifyEmail);
router.post('/refresh', authenticate, controller.refreshToken);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication, registration, email verification, token management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and sends a 6-digit verification code to email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Minimum 8 characters
 *               firstName:
 *                 type: string
 *                 example: Andrii
 *               lastName:
 *                 type: string
 *                 example: Salohub
 *     responses:
 *       201:
 *         description: Registration successful. Verification code sent to email.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 message: "Registration successful. Please check your email to verify your account."
 *                 userId: "clz123abc456def789"
 *               message: "Registration successful. Please verify your email."
 *       400:
 *         description: Invalid email, weak password, or user already exists
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticates user and returns JWT token in httpOnly cookie + response
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly JWT token (valid 7 days)
 *             schema:
 *               type: string
 *               example: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; Max-Age=604800
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
 *                     user:
 *                       $ref: '#/components/schemas/UserPublic'
 *                     token:
 *                       type: string
 *                       description: JWT token (also sent in cookie)
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified or account blocked
 */

/**
 * @swagger
 * /api/auth/verify-email/{userId}:
 *   post:
 *     summary: Verify email with 6-digit code
 *     description: Completes registration by verifying the code sent to email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID returned during registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: ^\d{6}$
 *                 example: "483920"
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/UserPublic'
 *                     token:
 *                       type: string
 *       400:
 *         description: Invalid or expired code
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     description: Generates a new access token using valid current token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New token issued
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
 *                     token:
 *                       type: string
 *       401:
 *         description: Invalid or expired token
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Clears the httpOnly cookie
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         headers:
 *           Set-Cookie:
 *             description: Cookie cleared
 *             schema:
 *               type: string
 *               example: token=; HttpOnly; Max-Age=0
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns profile of the logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserPublic'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPublic:
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
 *         emailVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - email
 *         - role
 *         - emailVerified
 */

export default router;
