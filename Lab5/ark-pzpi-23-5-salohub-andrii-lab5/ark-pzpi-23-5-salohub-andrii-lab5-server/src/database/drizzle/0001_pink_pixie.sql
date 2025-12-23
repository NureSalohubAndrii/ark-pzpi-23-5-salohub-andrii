DROP TABLE "iot_devices" CASCADE;--> statement-breakpoint
DROP TABLE "iot_telemetry" CASCADE;--> statement-breakpoint
DROP TABLE "iot_alerts" CASCADE;--> statement-breakpoint
ALTER TABLE "vehicle_checks" ADD COLUMN "vin" varchar(17) NOT NULL;