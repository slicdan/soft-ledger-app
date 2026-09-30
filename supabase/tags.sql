-- SoftLedger tags table, matching the live schema after migration
-- 20260930143325_rename_cards_to_tags. tag_no is unique per user.
-- Referenced by public/js/tags.js.

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  tag_no     text not null check (length(btrim(tag_no)) > 0),
  full_name  text,
  phone      text,
  created_at timestamptz not null default now(),
  unique (user_id, tag_no)
);

alter table public.tags enable row level security;

create policy tags_select_own on public.tags for select using (user_id = auth.uid());
create policy tags_insert_own on public.tags for insert with check (user_id = auth.uid());
create policy tags_update_own on public.tags for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_delete_own on public.tags for delete using (user_id = auth.uid());

-- Grants: Supabase default. RLS policies enforce actual access.
grant all on public.tags to anon, authenticated;
