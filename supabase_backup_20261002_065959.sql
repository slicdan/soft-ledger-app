-- ============================================================================
-- SoftLedger Database Backup
-- Generated: 2026-10-02
-- Supabase Project: upbktiqxxmwdnabvghvk.supabase.co
-- ============================================================================
-- This backup contains the complete database schema including:
-- - Tables: customers, charges, payments, payment_items, tags, profiles
-- - Views: v_customer_balances, v_transactions
-- - Row Level Security (RLS) policies
-- - Indexes, constraints, and foreign keys
-- - Functions and triggers (if any)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES TABLE
-- User profile information linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT,
  phone TEXT,
  email TEXT,
  business_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles 
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles 
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_own ON public.profiles 
  FOR DELETE USING (id = auth.uid());

GRANT ALL ON public.profiles TO anon, authenticated;

-- ============================================================================
-- CUSTOMERS TABLE
-- Customer information with balance tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (length(btrim(full_name)) > 0),
  phone TEXT CHECK (phone IS NULL OR length(btrim(phone)) > 0),
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_created_at_idx ON public.customers(created_at);

-- RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_own ON public.customers 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY customers_insert_own ON public.customers 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_update_own ON public.customers 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY customers_delete_own ON public.customers 
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.customers TO anon, authenticated;

-- ============================================================================
-- CHARGES TABLE
-- Charges billed to customers for device usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device TEXT NOT NULL CHECK (length(btrim(device)) > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  duration TEXT NOT NULL CHECK (length(btrim(duration)) > 0),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for charges
CREATE INDEX IF NOT EXISTS charges_user_id_idx ON public.charges(user_id);
CREATE INDEX IF NOT EXISTS charges_customer_id_idx ON public.charges(customer_id);
CREATE INDEX IF NOT EXISTS charges_created_at_idx ON public.charges(created_at);

-- RLS for charges
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY charges_select_own ON public.charges 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY charges_insert_own ON public.charges 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY charges_update_own ON public.charges 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY charges_delete_own ON public.charges 
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.charges TO anon, authenticated;

-- ============================================================================
-- TAGS TABLE
-- Payment tags/cards for quick payment processing (formerly cards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_no TEXT NOT NULL CHECK (length(btrim(tag_no)) > 0),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_no)
);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);

-- RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_own ON public.tags 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY tags_insert_own ON public.tags 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY tags_update_own ON public.tags 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY tags_delete_own ON public.tags 
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.tags TO anon, authenticated;

-- ============================================================================
-- PAYMENTS TABLE
-- Payments received from customers or tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  tag_id UUID REFERENCES public.tags(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL CHECK (length(btrim(method)) > 0),
  notes TEXT,
  -- Legacy columns (kept for backward compatibility, no longer written)
  device TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: payment must be linked to either a customer OR a tag
  CHECK (
    (customer_id IS NOT NULL AND tag_id IS NULL) OR 
    (customer_id IS NULL AND tag_id IS NOT NULL)
  )
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS payments_tag_id_idx ON public.payments(tag_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments(created_at);

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_own ON public.payments 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY payments_insert_own ON public.payments 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY payments_update_own ON public.payments 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY payments_delete_own ON public.payments 
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.payments TO anon, authenticated;

-- ============================================================================
-- PAYMENT_ITEMS TABLE
-- Multi-device payment details (one payment -> many device/quantity rows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  device TEXT NOT NULL CHECK (length(btrim(device)) > 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A device type appears at most once per payment; quantity carries the count
  UNIQUE (payment_id, device)
);

-- Indexes for payment_items
CREATE INDEX IF NOT EXISTS payment_items_payment_id_idx ON public.payment_items(payment_id);
CREATE INDEX IF NOT EXISTS payment_items_user_id_idx ON public.payment_items(user_id);

-- RLS for payment_items
ALTER TABLE public.payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_items_select_own ON public.payment_items 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY payment_items_insert_own ON public.payment_items 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY payment_items_update_own ON public.payment_items 
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY payment_items_delete_own ON public.payment_items 
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.payment_items TO anon, authenticated;

-- ============================================================================
-- VIEW: v_customer_balances
-- Computed customer balances (total charges - total payments)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_customer_balances
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.user_id,
  c.full_name,
  c.phone,
  c.is_trusted,
  c.created_at,
  c.updated_at,
  COALESCE(SUM(ch.amount), 0) AS total_charges,
  COALESCE(SUM(p.amount), 0) AS total_payments,
  COALESCE(SUM(ch.amount), 0) - COALESCE(SUM(p.amount), 0) AS balance
FROM public.customers c
LEFT JOIN public.charges ch ON ch.customer_id = c.id
LEFT JOIN public.payments p ON p.customer_id = c.id
GROUP BY c.id, c.user_id, c.full_name, c.phone, c.is_trusted, c.created_at, c.updated_at;

GRANT SELECT ON public.v_customer_balances TO anon, authenticated;

-- ============================================================================
-- VIEW: v_transactions
-- Unified view of charges and payments for transaction history
-- ============================================================================

CREATE OR REPLACE VIEW public.v_transactions
WITH (security_invoker = true)
AS
-- Charges
SELECT 
  c.id,
  c.user_id,
  c.customer_id,
  'charge' AS type,
  c.device,
  c.quantity,
  c.duration,
  c.amount,
  NULL::TEXT AS method,
  c.notes,
  c.created_at
FROM public.charges c

UNION ALL

-- Payments
SELECT 
  p.id,
  p.user_id,
  p.customer_id,
  'payment' AS type,
  p.device,
  p.quantity,
  NULL::TEXT AS duration,
  p.amount,
  p.method,
  p.notes,
  p.created_at
FROM public.payments p;

GRANT SELECT ON public.v_transactions TO anon, authenticated;

-- ============================================================================
-- MIGRATION HISTORY
-- Track applied migrations
-- ============================================================================

-- Migration: 20260930143605_rename_cards_to_tags
-- Renamed cards table to tags and card_no to tag_no
-- Applied constraints and policy renames

-- Migration: 20261001150000_payment_items
-- Created payment_items table for multi-device payments
-- Backfilled existing payment data from legacy device/quantity columns

-- Backfill comment: The following INSERT would backfill payment_items from
-- existing payments with device data. Only run this if payments exist:
-- INSERT INTO public.payment_items (user_id, payment_id, device, quantity, created_at)
-- SELECT p.user_id, p.id, p.device, p.quantity, p.created_at
-- FROM public.payments p
-- WHERE p.device IS NOT NULL
--   AND length(btrim(p.device)) > 0
-- ON CONFLICT (payment_id, device) DO NOTHING;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_charges_updated_at ON public.charges;
CREATE TRIGGER update_charges_updated_at
  BEFORE UPDATE ON public.charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notify PostgREST to reload schema after migrations
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- END OF BACKUP
-- ============================================================================
-- To restore this backup:
-- 1. Create a new Supabase project or use an existing one
-- 2. Run this SQL file through the Supabase SQL Editor or psql
-- 3. Update your application's config.js with the new project URL and anon key
-- 4. Verify RLS policies are active: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ============================================================================
