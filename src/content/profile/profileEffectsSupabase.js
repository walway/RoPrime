import { createClient } from "@supabase/supabase-js";
import {
	isSupabaseProfileEffectsEnabled,
	SUPABASE_ANON_KEY,
	SUPABASE_URL,
} from "./profileEffectsConfig.js";

function parseRegistry(raw) {
	if (!raw || typeof raw !== "object") {
		return { version: 1, effects: {}, equipped: {} };
	}
	const effects =
		raw.effects && typeof raw.effects === "object" ? raw.effects : {};
	const equipped =
		raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
	return { version: raw.version ?? 1, effects, equipped };
}

/** @typedef {import("./profileEffectsRegistry.js").ProfileEffectEquipKind} ProfileEffectEquipKind */

let client = null;

function getClient() {
	if (!isSupabaseProfileEffectsEnabled()) return null;
	if (!client) {
		client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
	}
	return client;
}

/**
 * @returns {Promise<ReturnType<typeof parseRegistry> | null>}
 */
export async function fetchRegistryFromSupabase() {
	const supabase = getClient();
	if (!supabase) return null;

	const [ownersResult, equippedResult] = await Promise.all([
		supabase
			.from("profile_effect_owners")
			.select("roblox_user_id, effect_id, purchased_at"),
		supabase
			.from("profile_effect_equipped")
			.select("roblox_user_id, picture_effect_id, profile_effect_id"),
	]);

	if (ownersResult.error || equippedResult.error) {
		console.warn(
			"RoPrime: Supabase registry fetch failed",
			ownersResult.error || equippedResult.error,
		);
		return null;
	}

	const registry = parseRegistry(null);

	for (const row of ownersResult.data || []) {
		const effectId = String(row.effect_id || "").trim();
		const userId = String(row.roblox_user_id);
		if (!effectId || !/^\d+$/.test(userId)) continue;

		if (!registry.effects[effectId]) {
			registry.effects[effectId] = { owners: {} };
		}
		const purchasedAt = row.purchased_at
			? new Date(row.purchased_at).getTime()
			: Date.now();
		registry.effects[effectId].owners[userId] = { purchasedAt };
	}

	for (const row of equippedResult.data || []) {
		const userId = String(row.roblox_user_id);
		if (!/^\d+$/.test(userId)) continue;
		registry.equipped[userId] = {
			picture: String(row.picture_effect_id || "").trim(),
			profile: String(row.profile_effect_id || "").trim(),
		};
	}

	return registry;
}

/**
 * @param {string | number} userId
 * @param {string} effectId
 */
export async function supabaseRegisterPurchase(userId, effectId) {
	const supabase = getClient();
	if (!supabase || !userId || !effectId) return false;

	const robloxUserId = Number(userId);
	if (!Number.isFinite(robloxUserId) || robloxUserId <= 0) return false;

	const { error } = await supabase.from("profile_effect_owners").upsert(
		{
			roblox_user_id: robloxUserId,
			effect_id: effectId,
			purchased_at: new Date().toISOString(),
		},
		{ onConflict: "roblox_user_id,effect_id" },
	);

	if (error) {
		console.warn("RoPrime: Supabase purchase failed", error);
		return false;
	}
	return true;
}

/**
 * @param {string | number} userId
 * @param {string} effectId Empty clears the slot for `kind`.
 * @param {ProfileEffectEquipKind} kind
 */
export async function supabaseRegisterEquip(userId, effectId, kind) {
	const supabase = getClient();
	if (!supabase || !userId) return false;

	const robloxUserId = Number(userId);
	if (!Number.isFinite(robloxUserId) || robloxUserId <= 0) return false;

	const slot = kind === "picture" ? "picture_effect_id" : "profile_effect_id";
	const patch = {
		roblox_user_id: robloxUserId,
		updated_at: new Date().toISOString(),
		[slot]: effectId || null,
	};

	const { data: existing, error: readError } = await supabase
		.from("profile_effect_equipped")
		.select("picture_effect_id, profile_effect_id")
		.eq("roblox_user_id", robloxUserId)
		.maybeSingle();

	if (readError) {
		console.warn("RoPrime: Supabase equip read failed", readError);
		return false;
	}

	if (existing) {
		patch.picture_effect_id =
			slot === "picture_effect_id"
				? effectId || null
				: existing.picture_effect_id;
		patch.profile_effect_id =
			slot === "profile_effect_id"
				? effectId || null
				: existing.profile_effect_id;
	} else {
		patch.picture_effect_id =
			slot === "picture_effect_id" ? effectId || null : null;
		patch.profile_effect_id =
			slot === "profile_effect_id" ? effectId || null : null;
	}

	if (!patch.picture_effect_id && !patch.profile_effect_id) {
		const { error: deleteError } = await supabase
			.from("profile_effect_equipped")
			.delete()
			.eq("roblox_user_id", robloxUserId);
		if (deleteError) {
			console.warn("RoPrime: Supabase equip clear failed", deleteError);
			return false;
		}
		return true;
	}

	const { error } = await supabase
		.from("profile_effect_equipped")
		.upsert(patch, { onConflict: "roblox_user_id" });

	if (error) {
		console.warn("RoPrime: Supabase equip failed", error);
		return false;
	}
	return true;
}
