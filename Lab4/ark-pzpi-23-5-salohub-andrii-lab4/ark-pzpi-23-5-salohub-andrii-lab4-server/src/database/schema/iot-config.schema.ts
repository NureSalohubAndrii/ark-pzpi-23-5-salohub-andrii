import { pgTable, uuid, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { cars } from './cars.schema';

export const iotConfig = pgTable('iot_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  carId: uuid('car_id')
    .notNull()
    .unique()
    .references(() => cars.id, { onDelete: 'cascade' }),
  targetVin: varchar('target_vin', { length: 17 }).notNull(),

  activeInterval: integer('active_interval').notNull().default(10000),
  idleInterval: integer('idle_interval').notNull().default(1800000),

  batteryLowThreshold: integer('battery_low_threshold').notNull().default(1150),
  fuelLowThreshold: integer('fuel_low_threshold').notNull().default(10),
  humidityHighThreshold: integer('humidity_high_threshold').notNull().default(80),

  smoothingAlphaFuel: integer('smoothing_alpha_fuel').notNull().default(10),
  smoothingAlphaBattery: integer('smoothing_alpha_battery').notNull().default(30),

  enabled: boolean('enabled').notNull().default(true),
  lastSync: timestamp('last_sync'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
