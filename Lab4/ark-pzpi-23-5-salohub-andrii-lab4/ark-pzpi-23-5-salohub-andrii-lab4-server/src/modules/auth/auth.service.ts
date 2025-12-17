import { and, eq, gt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateEmail } from '../../shared/utils/validation.util';
import { AppError } from '../../shared/middlewares/error.middleware';
import { db } from '../../database';
import { users, verificationCodes } from '../../database/schema';
import { sendVerificationEmail } from '../../shared/utils/email.util';

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '7d',
    });
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(data: RegisterData) {
    if (!validateEmail(data.email)) {
      throw new AppError(400, 'Invalid email format');
    }

    if (data.password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters long');
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
      with: {
        verificationCodes: true,
      },
    });

    if (existingUser && !existingUser.emailVerified) {
      await db.delete(verificationCodes).where(eq(verificationCodes.userId, existingUser.id));
      await db.delete(users).where(eq(users.id, existingUser.id));
    }

    if (existingUser && existingUser.emailVerified) {
      throw new AppError(400, 'User with this email already exists and is verified');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'user',
        emailVerified: false,
      })
      .returning();

    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(verificationCodes).values({
      userId: user.id,
      code,
      expiresAt,
    });

    await sendVerificationEmail(user.email, code);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    };
  }

  async login(data: LoginData) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new AppError(403, 'Please verify your email before logging in');
    }

    if (user.isBlocked) {
      throw new AppError(403, 'Your account has been blocked. Please contact support.');
    }

    if (!user.passwordHash) {
      throw new AppError(401, 'Invalid login method. Please use Google Sign-In.');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      token,
    };
  }

  async verifyEmail(userId: string, code: string) {
    console.log(new Date());
    const verification = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verification) {
      throw new AppError(400, 'Invalid or expired verification code');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.emailVerified) {
      throw new AppError(400, 'Email already verified');
    }

    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));

    await db.delete(verificationCodes).where(eq(verificationCodes.userId, userId));

    const token = this.generateToken(user.id, user.role);

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: true,
      },
      token,
    };
  }

  async refreshToken(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.isBlocked) {
      throw new AppError(403, 'Your account has been blocked');
    }

    const token = this.generateToken(user.id, user.role);

    return { token };
  }
}
