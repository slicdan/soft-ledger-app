


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."charges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "device" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "charges_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "charges_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "is_trusted" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "device" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_items_device_check" CHECK (("length"("btrim"("device")) > 0)),
    CONSTRAINT "payment_items_quantity_check" CHECK (("quantity" >= 1))
);


ALTER TABLE "public"."payment_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "method" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tag_id" "uuid",
    "device" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payments_quantity_check" CHECK (("quantity" >= 1)),
    CONSTRAINT "payments_recipient_check" CHECK ((("customer_id" IS NULL) <> ("tag_id" IS NULL)))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "store_name" "text",
    "business_type" "text",
    "location" "text",
    "notifications_enabled" boolean DEFAULT true NOT NULL,
    "auto_backup_enabled" boolean DEFAULT true NOT NULL,
    "dark_mode_enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "tag_no" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tags_tag_no_check" CHECK (("length"("btrim"("tag_no")) > 0))
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_customer_balances" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."user_id",
    "c"."full_name",
    "c"."phone",
    "c"."is_trusted",
    "c"."created_at",
    COALESCE("ch"."total", (0)::numeric) AS "total_charges",
    COALESCE("p"."total", (0)::numeric) AS "total_payments",
    (COALESCE("ch"."total", (0)::numeric) - COALESCE("p"."total", (0)::numeric)) AS "balance"
   FROM (("public"."customers" "c"
     LEFT JOIN ( SELECT "charges"."customer_id",
            "sum"("charges"."amount") AS "total"
           FROM "public"."charges"
          GROUP BY "charges"."customer_id") "ch" ON (("ch"."customer_id" = "c"."id")))
     LEFT JOIN ( SELECT "payments"."customer_id",
            "sum"("payments"."amount") AS "total"
           FROM "public"."payments"
          WHERE ("payments"."customer_id" IS NOT NULL)
          GROUP BY "payments"."customer_id") "p" ON (("p"."customer_id" = "c"."id")));


ALTER VIEW "public"."v_customer_balances" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_transactions" WITH ("security_invoker"='true') AS
 SELECT "charges"."id",
    "charges"."user_id",
    "charges"."customer_id",
    'charge'::"text" AS "type",
    "charges"."amount",
    "charges"."notes",
    "charges"."created_at"
   FROM "public"."charges"
UNION ALL
 SELECT "payments"."id",
    "payments"."user_id",
    "payments"."customer_id",
    'payment'::"text" AS "type",
    "payments"."amount",
    "payments"."notes",
    "payments"."created_at"
   FROM "public"."payments";


ALTER VIEW "public"."v_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_items"
    ADD CONSTRAINT "payment_items_payment_id_device_key" UNIQUE ("payment_id", "device");



ALTER TABLE ONLY "public"."payment_items"
    ADD CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_tag_no_key" UNIQUE ("user_id", "tag_no");



CREATE INDEX "charges_customer_id_idx" ON "public"."charges" USING "btree" ("customer_id");



CREATE INDEX "charges_user_id_idx" ON "public"."charges" USING "btree" ("user_id");



CREATE INDEX "customers_user_id_idx" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "payment_items_payment_id_idx" ON "public"."payment_items" USING "btree" ("payment_id");



CREATE INDEX "payment_items_user_id_idx" ON "public"."payment_items" USING "btree" ("user_id");



CREATE INDEX "payments_customer_id_idx" ON "public"."payments" USING "btree" ("customer_id");



CREATE INDEX "payments_tag_id_idx" ON "public"."payments" USING "btree" ("tag_id");



CREATE INDEX "payments_user_id_idx" ON "public"."payments" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_items"
    ADD CONSTRAINT "payment_items_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_items"
    ADD CONSTRAINT "payment_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."charges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "charges_delete_own" ON "public"."charges" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "charges_insert_own" ON "public"."charges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "charges_select_own" ON "public"."charges" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "charges_update_own" ON "public"."charges" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_delete_own" ON "public"."customers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "customers_insert_own" ON "public"."customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "customers_select_own" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "customers_update_own" ON "public"."customers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."payment_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_items_delete_own" ON "public"."payment_items" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_items_insert_own" ON "public"."payment_items" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_items_select_own" ON "public"."payment_items" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "payment_items_update_own" ON "public"."payment_items" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete_own" ON "public"."payments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "payments_insert_own" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "payments_select_own" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "payments_update_own" ON "public"."payments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_delete_own" ON "public"."tags" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "tags_insert_own" ON "public"."tags" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "tags_select_own" ON "public"."tags" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "tags_update_own" ON "public"."tags" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."charges" TO "anon";
GRANT ALL ON TABLE "public"."charges" TO "authenticated";
GRANT ALL ON TABLE "public"."charges" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."payment_items" TO "anon";
GRANT ALL ON TABLE "public"."payment_items" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_items" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."v_customer_balances" TO "anon";
GRANT ALL ON TABLE "public"."v_customer_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."v_customer_balances" TO "service_role";



GRANT ALL ON TABLE "public"."v_transactions" TO "anon";
GRANT ALL ON TABLE "public"."v_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_transactions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































