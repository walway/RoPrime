# Profile effects on Supabase

RoPrime stores **who bought which effect** and **what each user has equipped** in Supabase instead of the bundled `profile-effects-owners.json` file (which anyone could edit in the extension package).

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full contents of [`schema.sql`](./schema.sql).
3. Copy **Project URL** and the **publishable (anon) key** from **Settings → API**.
4. In the RoPrime repo root, create `.env` (see `.env.example`):

   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_KEY=your_publishable_anon_key
   ```

5. Run `npm run build` and reload the extension.

Purchases and equips from the cosmetics shop are written to:

- `profile_effect_owners` — one row per user + effect
- `profile_effect_equipped` — picture/profile slots per user

## One-time migration from old JSON

If you had owners in `profile-effects-owners.json`, insert them in SQL:

```sql
insert into public.profile_effect_owners (roblox_user_id, effect_id, purchased_at)
values
  (2605032407, 'dizzy', now()),
  (2605032407, 'clockwork', now())
on conflict (roblox_user_id, effect_id) do nothing;
```

## Security notes

- Never put the **service role** key in the extension or in git.
- Only the **publishable / anon** key belongs in `.env` for builds.
- Current RLS allows the anon role to insert/update rows (same trust model as the old public JSON). For production, add a Supabase Edge Function that checks a server secret before writing.

## Optional: Cloudflare Worker

You can still set `PROFILE_EFFECTS_API_BASE` in `profileEffectsRegistry.js` to merge data from a Worker; Supabase is used first when `.env` is configured.
