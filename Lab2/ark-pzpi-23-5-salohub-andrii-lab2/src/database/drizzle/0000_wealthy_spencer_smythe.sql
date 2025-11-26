CREATE TABLE "car_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"severity" varchar(20),
	"description" text,
	"mileage" integer,
	"location" varchar(255),
	"cost" numeric(10, 2),
	"verified_by_iot" boolean DEFAULT false NOT NULL,
	"document_url" varchar(500),
	"reported_by" uuid,
	"event_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_mileage" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vin" varchar(17) NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"color" varchar(50),
	"engine_type" varchar(50),
	"transmission" varchar(50),
	"fuel_type" varchar(50),
	"current_mileage" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"risk_level" varchar(20) DEFAULT 'low' NOT NULL,
	"ownership_document_url" varchar(500),
	"mileage_unit" varchar(10) DEFAULT 'km',
	"description" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cars_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"google_id" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_codes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"car_id" uuid NOT NULL,
	"device_type" varchar(50) DEFAULT 'obd2' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_connection" timestamp,
	"firmware_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "iot_devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "iot_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"car_id" uuid NOT NULL,
	"mileage" integer,
	"fuel_level" numeric(5, 2),
	"humidity" numeric(5, 2),
	"battery_voltage" numeric(5, 2),
	"speed" numeric(6, 2),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"engine_temperature" numeric(5, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"telemetry_id" uuid,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"car_id" uuid NOT NULL,
	"check_type" varchar(20) NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_status" varchar(20) DEFAULT 'free' NOT NULL,
	"report_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"metric_value" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_events" ADD CONSTRAINT "car_events_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_events" ADD CONSTRAINT "car_events_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_owners" ADD CONSTRAINT "car_owners_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_owners" ADD CONSTRAINT "car_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_telemetry" ADD CONSTRAINT "iot_telemetry_device_id_iot_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_telemetry" ADD CONSTRAINT "iot_telemetry_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_alerts" ADD CONSTRAINT "iot_alerts_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_alerts" ADD CONSTRAINT "iot_alerts_telemetry_id_iot_telemetry_id_fk" FOREIGN KEY ("telemetry_id") REFERENCES "public"."iot_telemetry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checks" ADD CONSTRAINT "vehicle_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checks" ADD CONSTRAINT "vehicle_checks_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;