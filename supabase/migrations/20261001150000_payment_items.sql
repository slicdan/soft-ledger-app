-- Multi-device payments: one payment -> many (device, quantity) rows.
-- Replaces the single payments.device / payments.quantity pair as the source
-- of truth. Legacy columns are kept (nullable/defaulted, no longer written)
-- so older clients and existing rows keep working; existing single-device
-- payments are backfilled into payment_items below.
-- Supabase runs each migration file in a single transaction.

create table public.payment_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  payment_id uuid not null references public.payments (id) on delete cascade,
  device     text not null check (length(btrim(device)) > 0),
  quantity   integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  -- A device type appears at most once per payment; quantity carries the count.
  unique (payment_id, device)
);

create index payment_items_payment_id_idx on public.payment_items (payment_id);
create index payment_items_user_id_idx    on public.payment_items (user_id);

alter table public.payment_items enable row level security;

create policy payment_items_select_own on public.payment_items for select using (user_id = auth.uid());
create policy payment_items_insert_own on public.payment_items for insert with check (user_id = auth.uid());
create policy payment_items_update_own on public.payment_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payment_items_delete_own on public.payment_items for delete using (user_id = auth.uid());

grant all on public.payment_items to anon, authenticated;

-- Backfill: every existing payment that recorded a device becomes one item.
insert into public.payment_items (user_id, payment_id, device, quantity, created_at)
select p.user_id, p.id, p.device, p.quantity, p.created_at
from public.payments p
where p.device is not null
  and length(btrim(p.device)) > 0
on conflict (payment_id, device) do nothing;

notify pgrst, 'reload schema';
