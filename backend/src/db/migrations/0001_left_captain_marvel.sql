CREATE TABLE IF NOT EXISTS "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline_id" text NOT NULL,
	"professor" text NOT NULL,
	"semester" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_discipline_id_disciplines_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "feedback_discipline_user_unique";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "group_work" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "offering_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "voter_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "material_quality" smallint;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "exam_difficulty" smallint;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "work_difficulty" smallint;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "offering_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offerings" ADD CONSTRAINT "offerings_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "offering_disc_prof_sem" ON "offerings" USING btree ("discipline_id","professor","semester");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_offering_voter_unique" ON "feedback" USING btree ("offering_id","voter_hash");--> statement-breakpoint
ALTER TABLE "disciplines" DROP COLUMN IF EXISTS "professor";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "discipline_id";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "rating";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "workload";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "exam_formats";--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN IF EXISTS "teaching_style";