# Add Card Verification Report

A1–A4 pass against the spec. A5, the live RLS behavior tests, did not run: the permission check denied the SQL call, so there are no runtime results for it.

## A1–A2. `public.cards` schema

| Column | Type | Default | Nullable | Matches spec |
|---|---|---|---|---|
| id | uuid | gen_random_uuid() | NO | Yes, primary key `cards_pkey` |
| user_id | uuid | auth.uid() | NO | Yes, foreign key to auth.users(id) ON DELETE CASCADE |
| card_no | text | none | NO | Yes, see note |
| full_name | text | none | YES | Yes |
| phone | text | none | YES | Yes |
| created_at | timestamptz | now() | NO | Yes |

- The unique constraint `cards_user_id_card_no_key` on (user_id, card_no) is there. It matches the spec.
- The check constraint `cards_card_no_check` is `length(btrim(card_no)) > 0`. It means the same as "btrim(card_no) is not empty."

## A3. RLS on `cards`

RLS is enabled. FORCE RLS is off, which is normal for Supabase.

| Policy | Command | USING | WITH CHECK |
|---|---|---|---|
| cards_select_own | SELECT | user_id = auth.uid() | none |
| cards_insert_own | INSERT | none | user_id = auth.uid() |
| cards_update_own | UPDATE | user_id = auth.uid() | user_id = auth.uid() |
| cards_delete_own | DELETE | user_id = auth.uid() | none |

- All four policies match the spec. Insert uses WITH CHECK, and update has both USING and WITH CHECK.
- None of the policies name a role, so they apply to every role, including `anon`. The `anon` role also has SELECT permission on the table. That's the Supabase default, and RLS still blocks it because `auth.uid()` is null for `anon`. Adding `TO authenticated` to the policies would make this tighter, but it isn't required.

## A4. Comparison with `customers`

- `customers.user_id` has no default, while `cards.user_id` defaults to `auth.uid()`. The app has to send `user_id` explicitly for customers, and the insert fails if it doesn't. This is a real difference.
- `customers_update_own` has USING but no WITH CHECK. When an UPDATE policy has no WITH CHECK, Postgres applies the USING expression to the new row. It behaves the same as `cards`, so this is only a style difference.
- The policy expressions are written `auth.uid() = user_id` on one table and `user_id = auth.uid()` on the other. That's cosmetic only.
- The two tables are otherwise the same: RLS is on, there are four policies scoped to the owner, and user_id has the same foreign key with cascade delete.
- Both tables call `auth.uid()` directly. Writing `(select auth.uid())` lets Postgres evaluate it once per query instead of once per row. This is a small performance tweak, not a correctness problem.

## A5. Behavioral tests: not run

The attempt was to run all five checks in one anonymous `DO` block as `authenticated` with simulated JWT claims:

- Insert '111'
- Insert a duplicate '111' (expect 23505)
- Insert a blank value (expect a check failure)
- Select across users
- Insert across users

The block also covered cross-user update and delete, plus an `anon` read. It ended by raising an exception so that every change rolled back. No workaround was attempted after the denial.

Nothing was written. For reference, before the attempt `cards` had 1 row and `auth.users` had 4 users.

To complete A5, allow that SQL call and re-run it, or run the script in the Supabase SQL editor. It uses existing users and leaves no rows behind.
