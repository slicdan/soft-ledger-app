// SoftLedger — all tag data calls. Pages call these; they never touch
// `supabase.from("tags")` directly. Table: supabase/tags.sql.

import { supabase } from "./supabase-client.js";

// Postgres unique_violation: the (user_id, tag_no) pair already exists.
export const TAG_DUPLICATE = "23505";

// tagNo is required; fullName and phone are optional and stored as null
// when blank.
export async function createTag({ tagNo, fullName, phone }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { data: null, error: userError };

  return supabase
    .from("tags")
    .insert({
      user_id: userData.user.id,
      tag_no: tagNo,
      full_name: fullName || null,
      phone: phone || null,
    })
    .select()
    .single();
}

// Number of saved tags, for the dashboard's Tags tile. Head request:
// returns the count only, no rows.
export async function countTags() {
  const { count, error } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true });
  return { count: count ?? 0, error };
}
