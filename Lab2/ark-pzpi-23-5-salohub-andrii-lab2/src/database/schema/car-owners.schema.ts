import { pgTable, uuid, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { cars } from './cars.schema';
import { users } from './users.schema';

export const carOwners = pgTable('car_owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  carId: uuid('car_id')
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startedMileage: integer('started_mileage'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
