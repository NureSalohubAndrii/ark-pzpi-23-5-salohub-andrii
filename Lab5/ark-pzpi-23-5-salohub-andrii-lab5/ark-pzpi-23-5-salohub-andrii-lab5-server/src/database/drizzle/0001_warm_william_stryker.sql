CREATE TABLE "iot_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"target_vin" varchar(17),
	"active_interval_ms" integer DEFAULT 10000,
	"idle_interval_ms" integer DEFAULT 1800000,
	"battery_low_threshold" numeric(4, 2) DEFAULT '11.5',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iot_configs_car_id_unique" UNIQUE("car_id")
);
--> statement-breakpoint
DROP TABLE "iot_device_config" CASCADE;--> statement-breakpoint
ALTER TABLE "iot_configs" ADD CONSTRAINT "iot_configs_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;