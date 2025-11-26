import { relations } from 'drizzle-orm';
import { users } from './schema/users.schema';
import { verificationCodes } from './schema/verification-codes.schema';
import { carEvents, carOwners, cars } from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  verificationCodes: many(verificationCodes),
}));

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id],
  }),
}));

export const carsRelations = relations(cars, ({ many }) => ({
  carOwners: many(carOwners),
  events: many(carEvents),
}));

export const carOwnersRelations = relations(carOwners, ({ one }) => ({
  car: one(cars, {
    fields: [carOwners.carId],
    references: [cars.id],
  }),
  user: one(users, {
    fields: [carOwners.userId],
    references: [users.id],
  }),
}));

export const carEventsRelations = relations(carEvents, ({ one }) => ({
  car: one(cars, {
    fields: [carEvents.carId],
    references: [cars.id],
  }),
  reportedByUser: one(users, {
    fields: [carEvents.reportedBy],
    references: [users.id],
  }),
}));
