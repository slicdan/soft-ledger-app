// SoftLedger — combined charge+payment feed reads, from v_transactions.
// Pages call these; they never touch the view directly.

import { supabase } from "./supabase-client.js";

// v_transactions has customer_id but no name column, so feed rows are
// decorated with `customer_name` from a second customers read. Keeps the
// { data, error } shape; data rows are view rows + customer_name.
async function withCustomerNames(result) {
  const { data, error } = result;
  if (error || !data || !data.length) return result;

  const ids = [...new Set(data.map((tx) => tx.customer_id))];
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, full_name")
    .in("id", ids);
  if (customersError) return { data: null, error: customersError };

  const names = new Map(customers.map((c) => [c.id, c.full_name]));
  return {
    data: data.map((tx) => ({ ...tx, customer_name: names.get(tx.customer_id) ?? null })),
    error: null,
  };
}

// Full feed, newest first. Backs transactions.html.
export async function listTransactions() {
  return withCustomerNames(
    await supabase
      .from("v_transactions")
      .select("*")
      .order("created_at", { ascending: false })
  );
}

// Latest `limit` entries, for the dashboard's Recent Activity list.
export async function listRecentTransactions(limit = 3) {
  return withCustomerNames(
    await supabase
      .from("v_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

// One customer's history, newest first, for customer-detail.html.
export async function listTransactionsForCustomer(customerId) {
  return supabase
    .from("v_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}
