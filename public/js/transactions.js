// SoftLedger — combined charge+payment feed reads, from v_transactions.
// Pages call these; they never touch the view directly.

import { supabase } from "./supabase-client.js";

// v_transactions has customer_id but no name column, so feed rows are
// decorated with `customer_name` from a second customers read. Payments made
// to a tag have a null customer_id; their `customer_name` is the tag label
// ("Tag 111"), resolved via payments.tag_id. Keeps the { data, error } shape;
// data rows are view rows + customer_name.
async function withCustomerNames(result) {
  const { data, error } = result;
  if (error || !data || !data.length) return result;

  const names = new Map();

  const customerIds = [...new Set(data.map((tx) => tx.customer_id).filter(Boolean))];
  if (customerIds.length) {
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, full_name")
      .in("id", customerIds);
    if (customersError) return { data: null, error: customersError };
    customers.forEach((c) => names.set(c.id, c.full_name));
  }

  const tagLabels = new Map(); // payment id -> "Tag 111"
  const tagPaymentIds = data.filter((tx) => !tx.customer_id && tx.type === "payment").map((tx) => tx.id);
  if (tagPaymentIds.length) {
    const { data: payRows, error: payError } = await supabase
      .from("payments")
      .select("id, tag_id")
      .in("id", tagPaymentIds);
    if (payError) return { data: null, error: payError };
    const tagIds = [...new Set(payRows.map((r) => r.tag_id).filter(Boolean))];
    if (tagIds.length) {
      const { data: tags, error: tagsError } = await supabase
        .from("tags")
        .select("id, tag_no")
        .in("id", tagIds);
      if (tagsError) return { data: null, error: tagsError };
      const tagNo = new Map(tags.map((t) => [t.id, t.tag_no]));
      payRows.forEach((r) => {
        if (tagNo.has(r.tag_id)) tagLabels.set(r.id, `Tag ${tagNo.get(r.tag_id)}`);
      });
    }
  }

  return {
    data: data.map((tx) => ({
      ...tx,
      customer_name: tx.customer_id ? names.get(tx.customer_id) ?? null : tagLabels.get(tx.id) ?? null,
    })),
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
