CREATE TABLE "iot_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"target_vin" varchar(17) NOT NULL,
	"active_interval" integer DEFAULT 10000 NOT NULL,
	"idle_interval" integer DEFAULT 1800000 NOT NULL,
	"battery_low_threshold" integer DEFAULT 1150 NOT NULL,
	"fuel_low_threshold" integer DEFAULT 10 NOT NULL,
	"humidity_high_threshold" integer DEFAULT 80 NOT NULL,
	"smoothing_alpha_fuel" integer DEFAULT 10 NOT NULL,
	"smoothing_alpha_battery" integer DEFAULT 30 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iot_config_car_id_unique" UNIQUE("car_id")
);
--> statement-breakpoint
DROP TABLE "iot_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "iot_config" ADD CONSTRAINT "iot_config_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;