// SoftLedger — all payment data calls. Pages call these; they never
// touch `supabase.from("payments")` directly.

import { supabase } from "./supabase-client.js";

// Returns the payment row plus `items`: [{ device, quantity }] (display order
// is the caller's job; see sortDeviceItems). Payments that predate payment_items (or were written by an
// older client) fall back to their legacy device/quantity columns, so
// single-device payments render identically either way.
export async function getPayment(id) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, payment_items(device, quantity)")
    .eq("id", id)
    .single();
  if (error || !data) return { data, error };

  const { payment_items: rows, ...payment } = data;
  let items = (rows || []).map(({ device, quantity }) => ({ device, quantity }));
  if (!items.length && payment.device) {
    items = [{ device: payment.device, quantity: payment.quantity ?? 1 }];
  }
  return { data: { ...payment, items }, error: null };
}

// Merge duplicate device types and drop invalid rows: [{device, quantity}].
function normalizeItems(items) {
  const merged = new Map();
  for (const it of items || []) {
    const device = String(it?.device || "").trim();
    const quantity = Math.floor(Number(it?.quantity));
    if (!device || !(quantity >= 1)) continue;
    merged.set(device, (merged.get(device) || 0) + quantity);
  }
  return [...merged].map(([device, quantity]) => ({ device, quantity }));
}

// Exactly one recipient: pass customerId OR tagId. Only the provided key is
// sent, so customer payments keep working before the tag_id migration lands.
// `items` is [{ device, quantity }] (one row per device type) stored in
// payment_items. Two requests (PostgREST has no multi-table insert); if the
// items insert fails the payment row is deleted again so no half-saved
// payment is left behind.
export async function createPayment({ customerId, tagId, items, amount, method, notes }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };
  const userId = userData.user.id;

  const rows = normalizeItems(items);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      ...(tagId ? { tag_id: tagId } : { customer_id: customerId }),
      amount,
      method,
      notes: notes || null,
    })
    .select()
    .single();
  if (error || !rows.length) return { data: payment, error };

  const { error: itemsError } = await supabase
    .from("payment_items")
    .insert(rows.map((r) => ({ user_id: userId, payment_id: payment.id, ...r })));
  if (itemsError) {
    await supabase.from("payments").delete().eq("id", payment.id);
    return { data: null, error: itemsError };
  }
  return { data: { ...payment, items: rows }, error: null };
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
