import { getExtensionResourceUrl } from "./core.js";
import { getAllProfileEffectIds } from "./profileEffectsCatalog.js";

/** Plugin owner — granted every profile effect without purchase. */
export const PLUGIN_OWNER_USER_IDS = [2605032407];

/**
 * Cloudflare Worker base URL (no trailing slash), e.g.
 * https://roprime-profile-effects.your-name.workers.dev
 * See workers/profile-effects/README.md
 */
export const PROFILE_EFFECTS_API_BASE = "";

/** Override registry URL; defaults to `${PROFILE_EFFECTS_API_BASE}/registry` */
export const PROFILE_EFFECTS_CDN_REGISTRY_URL = PROFILE_EFFECTS_API_BASE
	? `${PROFILE_EFFECTS_API_BASE.replace(/\/$/, "")}/registry`
	: "";

/** Override purchase URL; defaults to `${PROFILE_EFFECTS_API_BASE}/purchase` */
export const PROFILE_EFFECTS_REGISTER_API_URL = PROFILE_EFFECTS_API_BASE
	? `${PROFILE_EFFECTS_API_BASE.replace(/\/$/, "")}/purchase`
	: "";

/** Override equip URL; defaults to `${PROFILE_EFFECTS_API_BASE}/equip` */
export const PROFILE_EFFECTS_EQUIP_API_URL = PROFILE_EFFECTS_API_BASE
	? `${PROFILE_EFFECTS_API_BASE.replace(/\/$/, "")}/equip`
	: "";

const LOCAL_REGISTRY_PATH = "resources/data/profile-effects-owners.json";

let registryCache = null;
let registryFetchPromise = null;

export function isPluginOwner(userId) {
	const id = Number(userId);
	return Number.isFinite(id) && PLUGIN_OWNER_USER_IDS.includes(id);
}

export async function getRobloxUserId() {
	try {
		const response = await fetch(
			"https://users.roblox.com/v1/users/authenticated",
			{ credentials: "include" },
		);
		if (!response.ok) return null;
		const data = await response.json();
		const userId = Number(data?.id);
		return Number.isFinite(userId) && userId > 0 ? userId : null;
	} catch {
		return null;
	}
}

function parseRegistry(raw) {
	if (!raw || typeof raw !== "object") {
		return { version: 1, effects: {}, equipped: {} };
	}
	const effects = raw.effects && typeof raw.effects === "object" ? raw.effects : {};
	const equipped =
		raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
	return { version: raw.version ?? 1, effects, equipped };
}

function ownerIdsForEffect(registry, effectId) {
	const owners = registry?.effects?.[effectId]?.owners;
	if (!owners || typeof owners !== "object") return [];
	return Object.keys(owners).filter((id) => /^\d+$/.test(String(id)));
}

export function userOwnsOnRegistry(registry, userId, effectId) {
	if (!registry || userId == null) return false;
	if (isPluginOwner(userId)) return true;
	return ownerIdsForEffect(registry, effectId).includes(String(userId));
}

async function fetchRegistryFromUrl(url) {
	if (!url) return null;
	try {
		const response = await fetch(url, { cache: "no-store" });
		if (!response.ok) return null;
		return parseRegistry(await response.json());
	} catch {
		return null;
	}
}

export async function fetchProfileEffectsRegistry() {
	if (registryCache) return registryCache;
	if (registryFetchPromise) return registryFetchPromise;

	registryFetchPromise = (async () => {
		const localUrl = getExtensionResourceUrl(LOCAL_REGISTRY_PATH);
		const [localRegistry, cdnRegistry] = await Promise.all([
			fetchRegistryFromUrl(localUrl),
			fetchRegistryFromUrl(PROFILE_EFFECTS_CDN_REGISTRY_URL),
		]);

		const merged = parseRegistry(null);
		for (const source of [localRegistry, cdnRegistry]) {
			if (!source) continue;
			for (const [effectId, effectData] of Object.entries(source.effects)) {
				if (!merged.effects[effectId]) {
					merged.effects[effectId] = { owners: {} };
				}
				const owners = effectData?.owners;
				if (owners && typeof owners === "object") {
					Object.assign(merged.effects[effectId].owners, owners);
				}
			}
			if (source.equipped && typeof source.equipped === "object") {
				Object.assign(merged.equipped, source.equipped);
			}
		}

		registryCache = merged;
		return merged;
	})();

	try {
		return await registryFetchPromise;
	} finally {
		registryFetchPromise = null;
	}
}

export function invalidateProfileEffectsRegistryCache() {
	registryCache = null;
}

export async function registerProfileEffectPurchase(userId, effectId) {
	if (!userId || !effectId) return false;

	if (PROFILE_EFFECTS_REGISTER_API_URL) {
		try {
			const response = await fetch(PROFILE_EFFECTS_REGISTER_API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					effectId,
					purchasedAt: Date.now(),
				}),
			});
			if (response.ok) {
				invalidateProfileEffectsRegistryCache();
				return true;
			}
		} catch {
			/* fall through — still allow local ownership */
		}
	}

	return false;
}

export async function registerProfileEffectEquip(userId, effectId) {
	if (!userId) return false;

	const registry = await fetchProfileEffectsRegistry();
	if (!registry.equipped || typeof registry.equipped !== "object") {
		registry.equipped = {};
	}
	const key = String(userId);
	if (effectId) registry.equipped[key] = effectId;
	else delete registry.equipped[key];

	if (PROFILE_EFFECTS_EQUIP_API_URL) {
		try {
			const response = await fetch(PROFILE_EFFECTS_EQUIP_API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					effectId: effectId || null,
					equippedAt: Date.now(),
				}),
			});
			if (response.ok) {
				invalidateProfileEffectsRegistryCache();
				return true;
			}
		} catch {
			/* local equip still applies */
		}
	}

	return false;
}

export async function getEquippedEffectForProfileUser(
	profileUserId,
	localEquippedEffectId,
	equippedByUser,
) {
	const key = String(profileUserId);
	const fromMap =
		equippedByUser && typeof equippedByUser === "object"
			? String(equippedByUser[key] || "").trim()
			: "";

	const registry = await fetchProfileEffectsRegistry();
	const fromRegistry = String(registry.equipped?.[key] || "").trim();
	const fromLocal = String(localEquippedEffectId || "").trim();

	return fromRegistry || fromMap || fromLocal || "";
}

export async function syncOwnedEffectsFromRegistry(userId, ownedList) {
	if (!userId) return ownedList;
	if (isPluginOwner(userId)) return getAllProfileEffectIds();

	const registry = await fetchProfileEffectsRegistry();
	const next = new Set(
		Array.isArray(ownedList)
			? ownedList.filter((id) => typeof id === "string" && id.trim())
			: [],
	);
	for (const effectId of Object.keys(registry.effects)) {
		if (userOwnsOnRegistry(registry, userId, effectId)) {
			next.add(effectId);
		}
	}
	return [...next];
}
