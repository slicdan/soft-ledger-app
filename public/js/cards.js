// SoftLedger — all card data calls. Pages call these; they never touch
// `supabase.from("cards")` directly. Table: supabase/cards.sql.

import { supabase } from "./supabase-client.js";

// Postgres unique_violation: the (user_id, card_no) pair already exists.
export const CARD_DUPLICATE = "23505";

// cardNo is required; fullName and phone are optional and stored as null
// when blank.
export async function createCard({ cardNo, fullName, phone }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };

  return supabase
    .from("cards")
    .insert({
      user_id: userData.user.id,
      card_no: cardNo,
      full_name: fullName || null,
      phone: phone || null,
    })
    .select()
    .single();
}
