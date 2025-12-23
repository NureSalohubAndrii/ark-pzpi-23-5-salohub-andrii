CREATE TABLE "car_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"mileage" integer NOT NULL,
	"fuel_level" numeric(5, 2) NOT NULL,
	"humidity" numeric(5, 2) NOT NULL,
	"battery_voltage" numeric(4, 2) NOT NULL,
	"device_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_telemetry" ADD CONSTRAINT "car_telemetry_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;