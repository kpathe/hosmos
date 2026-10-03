CREATE TYPE "public"."charging_basis" AS ENUM('PER_SEAT', 'FULL_ROOM');--> statement-breakpoint
CREATE TYPE "public"."hosteller_status" AS ENUM('admitted', 'active', 'exit_pending', 'removed');--> statement-breakpoint
CREATE TYPE "public"."bill_item_type" AS ENUM('rent', 'electricity', 'security_deposit', 'advance_allocation', 'late_fine', 'adjustment', 'other');--> statement-breakpoint
CREATE TYPE "public"."bill_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'cheque', 'upi');--> statement-breakpoint
CREATE TYPE "public"."security_deposit_status" AS ENUM('held', 'settled');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('owner', 'manager', 'hosteller');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hostels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"electricity_rate_paise" integer DEFAULT 1100 NOT NULL,
	"security_deposit_amount_paise" integer DEFAULT 500000 NOT NULL,
	"late_fine_amount_paise" integer DEFAULT 100000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hostel_managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid NOT NULL,
	CONSTRAINT "uq_hostel_manager" UNIQUE("hostel_id","manager_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"charging_basis" charging_basis NOT NULL,
	"monthly_amount_paise" integer NOT NULL,
	"compatible_capacity" integer NOT NULL,
	"compatible_floors" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"room_number" text NOT NULL,
	"floor" text NOT NULL,
	"capacity" integer NOT NULL,
	"pricing_model_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_hostel_room_number" UNIQUE("hostel_id","room_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hostellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"name" text NOT NULL,
	"father_name" text,
	"email" text NOT NULL,
	"phone" text,
	"college" text,
	"branch" text,
	"address" text,
	"aadhaar_number_encrypted" text,
	"admission_date" date NOT NULL,
	"status" "hosteller_status" DEFAULT 'admitted' NOT NULL,
	"username" text,
	"password_hash" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hostellers_email_unique" UNIQUE("email"),
	CONSTRAINT "hostellers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_occupancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"hosteller_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"hostel_id" uuid NOT NULL,
	"item_type" "bill_item_type" NOT NULL,
	"description" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"hosteller_id" uuid NOT NULL,
	"billing_period_year" integer NOT NULL,
	"billing_period_month" integer NOT NULL,
	"status" "bill_status" DEFAULT 'unpaid' NOT NULL,
	"total_amount_paise" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_bill_period" UNIQUE("hosteller_id","billing_period_year","billing_period_month")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"hosteller_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"record_number" text NOT NULL,
	"payment_date" date NOT NULL,
	"amount_paise" integer NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"description" text,
	"reference" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_record_number_unique" UNIQUE("record_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "advance_rent_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hosteller_id" uuid NOT NULL,
	"hostel_id" uuid NOT NULL,
	"billing_period_year" integer NOT NULL,
	"billing_period_month" integer NOT NULL,
	"amount_paise" integer NOT NULL,
	"source_payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_advance_allocation_period" UNIQUE("hosteller_id","billing_period_year","billing_period_month")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hosteller_id" uuid NOT NULL,
	"hostel_id" uuid NOT NULL,
	"original_amount_paise" integer NOT NULL,
	"deductions_paise" integer DEFAULT 0 NOT NULL,
	"refunded_amount_paise" integer,
	"settlement_date" date,
	"settlement_notes" text,
	"status" "security_deposit_status" DEFAULT 'held' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"reading_value" numeric(10, 2) NOT NULL,
	"reading_date" date NOT NULL,
	"is_reset" boolean DEFAULT false NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" "user_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hostels" ADD CONSTRAINT "hostels_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hostel_managers" ADD CONSTRAINT "hostel_managers_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hostel_managers" ADD CONSTRAINT "hostel_managers_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hostel_managers" ADD CONSTRAINT "hostel_managers_assigned_by_owners_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."owners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pricing_models" ADD CONSTRAINT "pricing_models_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms" ADD CONSTRAINT "rooms_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hostellers" ADD CONSTRAINT "hostellers_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_hosteller_id_hostellers_id_fk" FOREIGN KEY ("hosteller_id") REFERENCES "public"."hostellers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bills" ADD CONSTRAINT "bills_hosteller_id_hostellers_id_fk" FOREIGN KEY ("hosteller_id") REFERENCES "public"."hostellers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_hosteller_id_hostellers_id_fk" FOREIGN KEY ("hosteller_id") REFERENCES "public"."hostellers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advance_rent_allocations" ADD CONSTRAINT "advance_rent_allocations_hosteller_id_hostellers_id_fk" FOREIGN KEY ("hosteller_id") REFERENCES "public"."hostellers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advance_rent_allocations" ADD CONSTRAINT "advance_rent_allocations_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advance_rent_allocations" ADD CONSTRAINT "advance_rent_allocations_source_payment_id_payments_id_fk" FOREIGN KEY ("source_payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_hosteller_id_hostellers_id_fk" FOREIGN KEY ("hosteller_id") REFERENCES "public"."hostellers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_owners_email" ON "owners" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostels_owner_id" ON "hostels" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostel_managers_hostel_id" ON "hostel_managers" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostel_managers_manager_id" ON "hostel_managers" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_managers_email" ON "managers" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_models_hostel_id" ON "pricing_models" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rooms_hostel_id" ON "rooms" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rooms_pricing_model_id" ON "rooms" USING btree ("pricing_model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostellers_hostel_id" ON "hostellers" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostellers_email" ON "hostellers" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostellers_status" ON "hostellers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hostellers_username" ON "hostellers" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_room_occupancies_room_id" ON "room_occupancies" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_room_occupancies_hosteller_id" ON "room_occupancies" USING btree ("hosteller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_room_occupancies_hostel_id" ON "room_occupancies" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_room_occupancies_effective_to" ON "room_occupancies" USING btree ("effective_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_items_bill_id" ON "bill_items" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bill_items_hostel_id" ON "bill_items" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_hostel_id" ON "bills" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_hosteller_id" ON "bills" USING btree ("hosteller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_period" ON "bills" USING btree ("hostel_id","billing_period_year","billing_period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_status" ON "bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_hostel_id" ON "payments" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_hosteller_id" ON "payments" USING btree ("hosteller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_bill_id" ON "payments" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_payment_date" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_advance_allocations_hosteller_id" ON "advance_rent_allocations" USING btree ("hosteller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_advance_allocations_lookup" ON "advance_rent_allocations" USING btree ("hosteller_id","billing_period_year","billing_period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_deposits_hosteller_id" ON "security_deposits" USING btree ("hosteller_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_security_deposits_hostel_id" ON "security_deposits" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meter_readings_room_id" ON "meter_readings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meter_readings_hostel_id" ON "meter_readings" USING btree ("hostel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meter_readings_room_date" ON "meter_readings" USING btree ("room_id","reading_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id","user_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_cleanup" ON "refresh_tokens" USING btree ("expires_at");