// SoftLedger — all customer data calls. Pages call these; they never
// touch `supabase.from("customers")` (or the balances view) directly.

import { supabase } from "./supabase-client.js";

// Customers + their live balance (total charged − total paid), newest
// first. Backs customers.html and the dashboard's Customers/Outstanding
// counts.
export async function listCustomersWithBalances() {
  return supabase
    .from("v_customer_balances")
    .select("*")
    .order("created_at", { ascending: false });
}

// Bare id/name/phone list, for the customer pickers on
// record-charge.html / record-payment.html.
export async function listCustomersBasic() {
  return supabase
    .from("customers")
    .select("id, full_name, phone")
    .order("created_at", { ascending: false });
}

// Single customer's balance, for the "Owes ₦X" label on record-payment.html.
export async function getCustomerBalance(customerId) {
  return supabase
    .from("v_customer_balances")
    .select("*")
    .eq("id", customerId)
    .single();
}

// Bare id/name/phone for one customer, for transaction-detail.html's
// customer link.
export async function getCustomerBasicById(id) {
  return supabase
    .from("customers")
    .select("id, full_name, phone")
    .eq("id", id)
    .single();
}

// fields: any of { full_name, phone, is_trusted } (column names).
export async function updateCustomer(id, fields) {
  return supabase
    .from("customers")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
}

// charges/payments reference customers ON DELETE RESTRICT, so this
// errors if the customer has any transaction history.
export async function deleteCustomer(id) {
  return supabase
    .from("customers")
    .delete()
    .eq("id", id);
}

export async function createCustomer({ fullName, phone, isTrusted }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };

  return supabase
    .from("customers")
    .insert({
      user_id: userData.user.id,
      full_name: fullName,
      phone,
      is_trusted: isTrusted,
    })
    .select()
    .single();
}
