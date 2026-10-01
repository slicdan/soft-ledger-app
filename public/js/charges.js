// SoftLedger — all charge data calls. Pages call these; they never
// touch `supabase.from("charges")` directly.

import { supabase } from "./supabase-client.js";

// Sum of today's charges, for the dashboard's "Total Today" / revenue
// cards. "Today" starts at local midnight in the browser's timezone, not
// UTC. Returns { total, error } — total is 0 on error so the page can
// still render.
export async function getTodayChargesTotal() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("charges")
    .select("amount")
    .gte("created_at", startOfToday.toISOString());

  if (error) return { total: 0, error };
  const total = (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
  return { total, error: null };
}

export async function getCharge(id) {
  return supabase
    .from("charges")
    .select("*")
    .eq("id", id)
    .single();
}

// `quantity` is sent only when above the column default of 1.
export async function createCharge({ customerId, device, quantity, duration, amount, notes }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };

  return supabase
    .from("charges")
    .insert({
      user_id: userData.user.id,
      customer_id: customerId,
      device,
      ...(quantity > 1 ? { quantity } : {}),
      duration,
      amount,
      notes: notes || null,
    })
    .select()
    .single();
}

// fields: any of { device, duration, amount, notes } (column names).
export async function updateCharge(id, fields) {
  return supabase
    .from("charges")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCharge(id) {
  return supabase
    .from("charges")
    .delete()
    .eq("id", id);
}

// Charges created in [from, to) (Date objects), oldest first, as
// { customer_id, amount, created_at } rows. Backs reports.html. PostgREST caps
// a single response at 1000 rows, so the read is paged; the extra `id` sort
// keeps page boundaries stable when rows share a timestamp.
export async function listChargesInRange(from, to) {
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("charges")
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
