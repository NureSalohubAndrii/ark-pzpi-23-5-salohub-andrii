CREATE TABLE "iot_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"vin" varchar(17) NOT NULL,
	"mileage" integer NOT NULL,
	"fuel_level" numeric(5, 2),
	"humidity" numeric(5, 2),
	"battery_voltage" numeric(4, 2),
	"engine_running" boolean DEFAULT false NOT NULL,
	"event_type" varchar(20) DEFAULT 'periodic' NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "vehicle_telemetry" CASCADE;--> statement-breakpoint
ALTER TABLE "iot_telemetry" ADD CONSTRAINT "iot_telemetry_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;