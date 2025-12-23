import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateVerificationCode = (): string => {
  const randomNumber = crypto.randomInt(1000, 10000);
  return randomNumber.toString();
};

export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
    expiresIn: '2h',
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};
