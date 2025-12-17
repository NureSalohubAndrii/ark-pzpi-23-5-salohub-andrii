import { pgTable, uuid, varchar, integer, decimal, timestamp, boolean } from 'drizzle-orm/pg-core';
import { cars } from './cars.schema';

export const iotTelemetry = pgTable('iot_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),

  carId: uuid('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),

  vin: varchar('vin', { length: 17 }).notNull(),

  mileage: integer('mileage').notNull(), // Пробіг в км
  fuelLevel: decimal('fuel_level', { precision: 5, scale: 2 }), // Рівень палива в %
  humidity: decimal('humidity', { precision: 5, scale: 2 }), // Вологість в салоні %
  batteryVoltage: decimal('battery_voltage', { precision: 4, scale: 2 }), // Напруга АКБ в V

  engineRunning: boolean('engine_running').notNull().default(false), // Чи запущений двигун
  eventType: varchar('event_type', { length: 20 }).notNull().default('periodic'), // periodic | engine_start | engine_stop

  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
