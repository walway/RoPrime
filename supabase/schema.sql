-- RoPrime profile effects (run in Supabase SQL Editor)

create table if not exists public.profile_effect_owners (
	roblox_user_id bigint not null,
	effect_id text not null,
	purchased_at timestamptz not null default now(),
	primary key (roblox_user_id, effect_id)
);

create table if not exists public.profile_effect_equipped (
	roblox_user_id bigint primary key,
	picture_effect_id text,
	profile_effect_id text,
	updated_at timestamptz not null default now()
);

create index if not exists profile_effect_owners_effect_id_idx
	on public.profile_effect_owners (effect_id);

alter table public.profile_effect_owners enable row level security;
alter table public.profile_effect_equipped enable row level security;

-- Everyone can read (friends list / profiles need global visibility)
drop policy if exists "profile_effect_owners_select" on public.profile_effect_owners;
create policy "profile_effect_owners_select"
	on public.profile_effect_owners for select
	using (true);

drop policy if exists "profile_effect_equipped_select" on public.profile_effect_equipped;
create policy "profile_effect_equipped_select"
	on public.profile_effect_equipped for select
	using (true);

-- Extension writes purchases/equips with the anon (publishable) key.
-- Tighten later (e.g. Edge Function + secret) if you need stronger anti-abuse.
drop policy if exists "profile_effect_owners_insert" on public.profile_effect_owners;
create policy "profile_effect_owners_insert"
	on public.profile_effect_owners for insert
	with check (true);

drop policy if exists "profile_effect_owners_update" on public.profile_effect_owners;
create policy "profile_effect_owners_update"
	on public.profile_effect_owners for update
	using (true);

drop policy if exists "profile_effect_equipped_insert" on public.profile_effect_equipped;
create policy "profile_effect_equipped_insert"
	on public.profile_effect_equipped for insert
	with check (true);

drop policy if exists "profile_effect_equipped_update" on public.profile_effect_equipped;
create policy "profile_effect_equipped_update"
	on public.profile_effect_equipped for update
	using (true);
