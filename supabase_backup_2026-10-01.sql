-- =====================================================
-- SUPABASE DATABASE BACKUP
-- Generated: 2026-10-01
-- Database: Soft Ledger App
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- =====================================================
-- SCHEMA: public
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- Table: charges
CREATE TABLE IF NOT EXISTS public.charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    device text NOT NULL,
    duration text NOT NULL,
    amount numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);

-- Table: customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    is_trusted boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    customer_id uuid,
    amount numeric NOT NULL,
    method text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tag_id uuid,
    device text,
    quantity integer DEFAULT 1 NOT NULL
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    store_name text,
    business_type text,
    location text,
    notifications_enabled boolean DEFAULT true NOT NULL,
    auto_backup_enabled boolean DEFAULT true NOT NULL,
    dark_mode_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: tags
CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    tag_no text NOT NULL,
    full_name text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PRIMARY KEYS
-- =====================================================

ALTER TABLE public.charges ADD CONSTRAINT charges_pkey PRIMARY KEY (id);
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.tags ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

-- =====================================================
-- UNIQUE CONSTRAINTS
-- =====================================================

ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_tag_no_key UNIQUE (user_id, tag_no);

-- =====================================================
-- CHECK CONSTRAINTS
-- =====================================================

ALTER TABLE public.charges ADD CONSTRAINT charges_amount_check CHECK (amount >= 0::numeric);
ALTER TABLE public.charges ADD CONSTRAINT charges_quantity_check CHECK (quantity >= 1);
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0::numeric);
ALTER TABLE public.payments ADD CONSTRAINT payments_quantity_check CHECK (quantity >= 1);
ALTER TABLE public.payments ADD CONSTRAINT payments_recipient_check CHECK ((customer_id IS NULL) <> (tag_id IS NULL));
ALTER TABLE public.tags ADD CONSTRAINT tags_tag_no_check CHECK (length(btrim(tag_no)) > 0);

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

ALTER TABLE public.charges ADD CONSTRAINT charges_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE RESTRICT;
ALTER TABLE public.payments ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE RESTRICT;
ALTER TABLE public.payments ADD CONSTRAINT payments_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags (id) ON DELETE RESTRICT;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS charges_customer_id_idx ON public.charges USING btree (customer_id);
CREATE INDEX IF NOT EXISTS charges_user_id_idx ON public.charges USING btree (user_id);
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers USING btree (user_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON public.payments USING btree (customer_id);
CREATE INDEX IF NOT EXISTS payments_tag_id_idx ON public.payments USING btree (tag_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments USING btree (user_id);

-- =====================================================
-- VIEWS
-- =====================================================

-- View: v_customer_balances
CREATE OR REPLACE VIEW public.v_customer_balances AS 
SELECT 
    c.id,
    c.user_id,
    c.full_name,
    c.phone,
    c.is_trusted,
    c.created_at,
    (COALESCE(ch.total_charged, (0)::numeric) - COALESCE(p.total_paid, (0)::numeric)) AS balance
FROM customers c
LEFT JOIN (
    SELECT charges.customer_id,
           sum(charges.amount) AS total_charged
    FROM charges
    GROUP BY charges.customer_id
) ch ON (ch.customer_id = c.id)
LEFT JOIN (
    SELECT payments.customer_id,
           sum(payments.amount) AS total_paid
    FROM payments
    GROUP BY payments.customer_id
) p ON (p.customer_id = c.id);

-- View: v_transactions
CREATE OR REPLACE VIEW public.v_transactions AS 
SELECT 
    charges.id,
    charges.user_id,
    charges.customer_id,
    'charge'::text AS type,
    charges.amount,
    charges.notes,
    charges.created_at
FROM charges
UNION ALL
SELECT 
    payments.id,
    payments.user_id,
    payments.customer_id,
    'payment'::text AS type,
    payments.amount,
    payments.notes,
    payments.created_at
FROM payments;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for charges table
CREATE POLICY charges_delete_own ON public.charges AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY charges_insert_own ON public.charges AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY charges_select_own ON public.charges AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY charges_update_own ON public.charges AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));

-- Policies for customers table
CREATE POLICY customers_delete_own ON public.customers AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY customers_insert_own ON public.customers AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY customers_select_own ON public.customers AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY customers_update_own ON public.customers AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));

-- Policies for payments table
CREATE POLICY payments_delete_own ON public.payments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY payments_insert_own ON public.payments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY payments_select_own ON public.payments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY payments_update_own ON public.payments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));

-- Policies for profiles table
CREATE POLICY profiles_insert_own ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_select_own ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));

-- Policies for tags table
CREATE POLICY tags_delete_own ON public.tags AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY tags_insert_own ON public.tags AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY tags_select_own ON public.tags AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY tags_update_own ON public.tags AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- =====================================================
-- END OF SCHEMA DEFINITIONS
-- =====================================================
