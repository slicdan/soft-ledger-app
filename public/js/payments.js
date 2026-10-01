// SoftLedger — all payment data calls. Pages call these; they never
// touch `supabase.from("payments")` directly.

import { supabase } from "./supabase-client.js";

export async function getPayment(id) {
  return supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .single();
}

// Exactly one recipient: pass customerId OR tagId. Only the provided key is
// sent, so customer payments keep working before the tag_id migration lands.
// `device` (Device / Item) and `quantity` are sent only for tag payments;
// quantity only when above the column default of 1.
export async function createPayment({ customerId, tagId, device, quantity, amount, method, notes }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };

  return supabase
    .from("payments")
    .insert({
      user_id: userData.user.id,
      ...(tagId ? { tag_id: tagId } : { customer_id: customerId }),
      ...(device ? { device } : {}),
      ...(quantity > 1 ? { quantity } : {}),
      amount,
      method,
      notes: notes || null,
    })
    .select()
    .single();
}

// fields: any of { amount, method, notes } (column names).
export async function updatePayment(id, fields) {
  return supabase
    .from("payments")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
}

export async function deletePayment(id) {
  return supabase
    .from("payments")
    .delete()
    .eq("id", id);
}

// Payments received in [from, to) (Date objects), oldest first, as
// { customer_id, amount, created_at } rows. Backs reports.html. Paged in
// 1000-row batches because PostgREST caps a single response; the extra `id`
// sort keeps page boundaries stable when rows share a timestamp.
export async function listPaymentsInRange(from, to) {
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("payments")
      .select("customer_id, amount, created_at")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { data: rows, error: null };
}
