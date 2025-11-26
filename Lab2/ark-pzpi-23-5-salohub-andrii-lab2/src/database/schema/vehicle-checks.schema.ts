import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { cars } from './cars.schema';

export const vehicleChecks = pgTable('vehicle_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  carId: uuid('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  vin: varchar('vin', { length: 17 }).notNull(),
  checkType: varchar('check_type', { length: 20 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('free'),
  reportUrl: varchar('report_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
