import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { cars } from './cars.schema';
import { users } from './users.schema';

export const carEvents = pgTable('car_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  carId: uuid('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }),
  description: text('description'),
  mileage: integer('mileage'),
  location: varchar('location', { length: 255 }),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  verifiedByIot: boolean('verified_by_iot').notNull().default(false),
  documentUrl: varchar('document_url', { length: 500 }),
  reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
  eventDate: timestamp('event_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
