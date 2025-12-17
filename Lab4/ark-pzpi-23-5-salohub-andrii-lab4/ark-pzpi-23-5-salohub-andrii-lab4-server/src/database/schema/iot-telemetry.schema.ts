import { pgTable, uuid, varchar, integer, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';
import { cars } from './cars.schema';

export const iotTelemetry = pgTable('iot_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  carId: uuid('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  vin: varchar('vin', { length: 17 }).notNull(),
  mileage: integer('mileage').notNull(),
  fuelLevel: decimal('fuel_level', { precision: 5, scale: 2 }),
  humidity: decimal('humidity', { precision: 5, scale: 2 }),
  batteryVoltage: decimal('battery_voltage', { precision: 4, scale: 2 }),
  engineRunning: boolean('engine_running').notNull().default(false),
  eventType: varchar('event_type', { length: 20 }).notNull().default('periodic'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
