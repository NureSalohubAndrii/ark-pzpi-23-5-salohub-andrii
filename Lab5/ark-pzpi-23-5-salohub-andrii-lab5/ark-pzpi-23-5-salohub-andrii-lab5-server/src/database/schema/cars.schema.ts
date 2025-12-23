import { pgTable, uuid, varchar, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const cars = pgTable('cars', {
  id: uuid('id').primaryKey().defaultRandom(),
  vin: varchar('vin', { length: 17 }).notNull().unique(),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  year: integer('year').notNull(),
  color: varchar('color', { length: 50 }),
  engineType: varchar('engine_type', { length: 50 }),
  transmission: varchar('transmission', { length: 50 }),
  fuelType: varchar('fuel_type', { length: 50 }),
  currentMileage: integer('current_mileage').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  riskScore: integer('risk_score').notNull().default(0),
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('low'),
  ownershipDocumentUrl: varchar('ownership_document_url', { length: 500 }),
  mileageUnit: varchar('mileage_unit', { length: 10 }).default('km'),
  description: text('description'),
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verificationNotes: text('verification_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
