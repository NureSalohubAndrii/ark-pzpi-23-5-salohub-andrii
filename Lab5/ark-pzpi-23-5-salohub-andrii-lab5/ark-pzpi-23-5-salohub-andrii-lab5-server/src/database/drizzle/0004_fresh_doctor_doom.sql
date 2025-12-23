CREATE TABLE "vehicle_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"mileage" integer,
	"fuel_level" integer,
	"cabin_humidity" numeric(5, 2),
	"battery_voltage" numeric(4, 2),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "car_telemetry" CASCADE;--> statement-breakpoint
ALTER TABLE "vehicle_telemetry" ADD CONSTRAINT "vehicle_telemetry_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;