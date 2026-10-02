-- Fix: v_customer_balances double-counted when a customer had BOTH charges
-- and payments. The old view LEFT JOINed charges and payments to customers
-- in the same query, so every charge row was repeated once per payment row
-- (and vice versa) before SUM(). Charges and payments are now totalled
-- separately, then joined one-to-one.
--
-- Same columns, same order, same security_invoker setting: no app changes.
-- Run in the Supabase SQL editor.

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
  COALESCE(ch.total, 0) AS total_charges,
  COALESCE(p.total, 0)  AS total_payments,
  COALESCE(ch.total, 0) - COALESCE(p.total, 0) AS balance
FROM public.customers c
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS total
  FROM public.charges
  GROUP BY customer_id
) ch ON ch.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS total
  FROM public.payments
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) p ON p.customer_id = c.id;

GRANT SELECT ON public.v_customer_balances TO anon, authenticated;
