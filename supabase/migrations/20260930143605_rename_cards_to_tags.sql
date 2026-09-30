-- Rename domain term Card -> Tag. Metadata-only renames: no data, types,
-- defaults, grants, RLS enablement or policy logic change.
-- Supabase runs each migration file in a single transaction.

alter table public.cards rename to tags;
alter table public.tags rename column card_no to tag_no;

-- Constraints (renaming PK/UNIQUE constraints also renames their indexes).
alter table public.tags rename constraint cards_pkey                to tags_pkey;
alter table public.tags rename constraint cards_user_id_card_no_key to tags_user_id_tag_no_key;
alter table public.tags rename constraint cards_card_no_check       to tags_tag_no_check;
alter table public.tags rename constraint cards_user_id_fkey        to tags_user_id_fkey;

-- RLS policies (logic unchanged).
alter policy cards_select_own on public.tags rename to tags_select_own;
alter policy cards_insert_own on public.tags rename to tags_insert_own;
alter policy cards_update_own on public.tags rename to tags_update_own;
alter policy cards_delete_own on public.tags rename to tags_delete_own;

notify pgrst, 'reload schema';
