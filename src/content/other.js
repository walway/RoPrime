import { saveSettings, settingsState } from "./core.js";
import {
	getAllProfileEffectIds,
	getProfileEffectById,
	getProfileEffectShopEmbedSrc,
	PROFILE_EFFECTS,
	PROFILE_PICTURE_EFFECTS,
} from "./profileEffectsCatalog.js";
import {
	equipSlotForKind,
	getRobloxUserId,
	isPluginOwner,
	normalizeEquippedEntry,
	registerProfileEffectEquip,
	registerProfileEffectPurchase,
	syncOwnedEffectsFromRegistry,
} from "./profileEffectsRegistry.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

let cachedAuthUserId = null;

function equippedFieldForKind(kind) {
	return kind === "picture"
		? "equippedProfilePictureEffect"
		: "equippedProfilePageEffect";
}

function getEquippedEffectIdForKind(kind) {
	return String(settingsState[equippedFieldForKind(kind)] || "").trim();
}

function setEquippedEffectIdForKind(kind, effectId) {
	settingsState[equippedFieldForKind(kind)] = effectId ? String(effectId) : "";
}

function isEffectOwned(effectId) {
	if (isPluginOwner(cachedAuthUserId)) return true;
	return (
		Array.isArray(settingsState.ownedProfileEffects) &&
		settingsState.ownedProfileEffects.includes(effectId)
	);
}

function isEffectEquipped(effectId) {
	const effect = getProfileEffectById(effectId);
	if (!effect) return false;
	return getEquippedEffectIdForKind(effect.kind) === effectId;
}

function migrateLegacyEquippedProfileEffect() {
	const legacy = String(settingsState.equippedProfileEffect || "").trim();
	if (!legacy) return false;

	const hasPicture = !!getEquippedEffectIdForKind("picture");
	const hasProfile = !!getEquippedEffectIdForKind("profile");
	if (hasPicture && hasProfile) {
		settingsState.equippedProfileEffect = "";
		return true;
	}

	const effect = getProfileEffectById(legacy);
	if (!effect) {
		settingsState.equippedProfileEffect = "";
		return true;
	}

	if (!hasPicture && effect.kind === "picture") {
		setEquippedEffectIdForKind("picture", legacy);
	}
	if (!hasProfile && effect.kind === "profile") {
		setEquippedEffectIdForKind("profile", legacy);
	}

	settingsState.equippedProfileEffect = "";
	return true;
}

function migrateLegacyEquippedByUserMap() {
	if (
		!settingsState.profileEffectsEquippedByUser ||
		typeof settingsState.profileEffectsEquippedByUser !== "object"
	) {
		settingsState.profileEffectsEquippedByUser = {};
		return false;
	}

	let changed = false;
	const next = {};
	for (const [userKey, entry] of Object.entries(
		settingsState.profileEffectsEquippedByUser,
	)) {
		if (!/^\d+$/.test(String(userKey))) continue;
		const normalized = normalizeEquippedEntry(entry);
		if (typeof entry === "string") {
			const effect = getProfileEffectById(normalized.picture);
			if (effect?.kind === "profile") {
				normalized.profile = normalized.picture;
				normalized.picture = "";
			}
			changed = true;
		}
		if (normalized.picture || normalized.profile) {
			next[userKey] = normalized;
		}
		if (
			typeof entry === "object" &&
			entry &&
			(JSON.stringify(entry) !== JSON.stringify(normalized) ||
				(!normalized.picture && !normalized.profile))
		) {
			changed = true;
		}
	}
	settingsState.profileEffectsEquippedByUser = next;
	return changed;
}

function normalizeEquippedForKind(kind) {
	migrateLegacyEquippedProfileEffect();
	const field = equippedFieldForKind(kind);
	const equipped = getEquippedEffectIdForKind(kind);
	if (!equipped) {
		settingsState[field] = "";
		return;
	}
	const effect = getProfileEffectById(equipped);
	if (!isEffectOwned(equipped) || !effect || effect.kind !== kind) {
		settingsState[field] = "";
	}
}

export function normalizeEquippedProfileEffects() {
	const migrated =
		migrateLegacyEquippedProfileEffect() ||
		migrateLegacyEquippedByUserMap();
	normalizeEquippedForKind("picture");
	normalizeEquippedForKind("profile");
	return migrated;
}

function setEquippedForUser(userId, effectId, kind) {
	if (!userId) return;
	const key = String(userId);
	if (!settingsState.profileEffectsEquippedByUser) {
		settingsState.profileEffectsEquippedByUser = {};
	}
	const slot = equipSlotForKind(kind);
	const entry = normalizeEquippedEntry(
		settingsState.profileEffectsEquippedByUser[key],
	);
	if (effectId) entry[slot] = effectId;
	else entry[slot] = "";

	if (!entry.picture && !entry.profile) {
		delete settingsState.profileEffectsEquippedByUser[key];
	} else {
		settingsState.profileEffectsEquippedByUser[key] = entry;
	}
}

export function buildProfileEffectsMarkup(effects = PROFILE_EFFECTS) {
	return effects.map(
		(effect) => `
		<article class="roprime-profile-effect-card" data-roprime-profile-effect="${effect.id}">
			<div class="roprime-profile-effect-preview">
				<div class="roprime-profile-effect-lottie">
					<iframe src="${getProfileEffectShopEmbedSrc(effect)}" title="${effect.titleKey}" loading="lazy"></iframe>
				</div>
			</div>
			<div class="roprime-profile-effect-footer">
				<div class="roprime-profile-effect-title" data-i18n="${effect.titleKey}"></div>
				<button type="button" class="roprime-settings-primary-btn roprime-profile-effect-action" data-roprime-effect-id="${effect.id}" data-roprime-effect-action="buy" data-i18n="Buy profile effect"></button>
			</div>
		</article>`,
	).join("");
}

export { PROFILE_EFFECTS, PROFILE_PICTURE_EFFECTS };

export function resizeCosmeticsPreviews(_shop) {}

let registrySyncPromise = null;

async function refreshAuthUserId() {
	cachedAuthUserId = await getRobloxUserId();
	return cachedAuthUserId;
}

async function ensureRegistryOwnershipSynced() {
	if (registrySyncPromise) return registrySyncPromise;
	registrySyncPromise = (async () => {
		const userId = await refreshAuthUserId();
		if (!userId) return;
		const merged = await syncOwnedEffectsFromRegistry(
			userId,
			settingsState.ownedProfileEffects,
		);
		const changed =
			JSON.stringify(merged) !==
			JSON.stringify(settingsState.ownedProfileEffects);
		settingsState.ownedProfileEffects = merged;
		if (isPluginOwner(userId)) {
			settingsState.ownedProfileEffects = getAllProfileEffectIds();
		}
		const equipMigrated = normalizeEquippedProfileEffects();
		if (changed || equipMigrated) saveSettings();
	})();
	try {
		await registrySyncPromise;
	} finally {
		registrySyncPromise = null;
	}
}

function syncEffectButtons(shop) {
	if (!(shop instanceof HTMLElement)) return;
	shop.querySelectorAll("[data-roprime-effect-id]").forEach((btn) => {
		if (!(btn instanceof HTMLButtonElement)) return;
		const effectId = btn.getAttribute("data-roprime-effect-id") || "";
		const owned = isEffectOwned(effectId);
		const equipped = isEffectEquipped(effectId);
		const card = btn.closest("[data-roprime-profile-effect]");

		btn.disabled = false;
		btn.classList.toggle("roprime-profile-effect-action--equipped", equipped);

		if (!owned) {
			btn.setAttribute("data-roprime-effect-action", "buy");
			btn.textContent = accountSettingsPaneT("Buy profile effect");
		} else if (equipped) {
			btn.setAttribute("data-roprime-effect-action", "unequip");
			btn.textContent = accountSettingsPaneT("Unequip profile effect");
		} else {
			btn.setAttribute("data-roprime-effect-action", "equip");
			btn.textContent = accountSettingsPaneT("Equip profile effect");
		}

		if (card instanceof HTMLElement) {
			card.classList.toggle("roprime-profile-effect-card--equipped", equipped);
		}
	});
}

export function syncCosmeticsUi(inner) {
	if (!(inner instanceof HTMLElement)) return;

	const enabled = !!settingsState.cosmeticsEnabled;
	inner.classList.toggle("roprime-cosmetics-enabled", enabled);

	const toggle = inner.querySelector("#roprime-toggle-cosmetics-enabled");
	if (toggle instanceof HTMLInputElement) toggle.checked = enabled;

	const shop = inner.querySelector("[data-roprime-cosmetics-shop]");
	if (!(shop instanceof HTMLElement)) return;

	shop.hidden = !enabled;
	shop.setAttribute("aria-hidden", enabled ? "false" : "true");

	if (!enabled) return;

	void refreshAuthUserId().then(() => {
		normalizeEquippedProfileEffects();
		syncEffectButtons(shop);
	});
	void ensureRegistryOwnershipSynced().then(() => {
		normalizeEquippedProfileEffects();
		syncEffectButtons(shop);
	});
}

export function bindCosmeticsControls(inner) {
	const toggle = inner.querySelector("#roprime-toggle-cosmetics-enabled");
	if (toggle instanceof HTMLInputElement) {
		toggle.addEventListener("change", () => {
			settingsState.cosmeticsEnabled = toggle.checked;
			saveSettings();
			syncCosmeticsUi(inner);
		});
	}

	const shop = inner.querySelector("[data-roprime-cosmetics-shop]");
	if (shop instanceof HTMLElement) {
		shop.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const btn = target.closest("[data-roprime-effect-id]");
			if (!(btn instanceof HTMLButtonElement)) return;

			const effectId = btn.getAttribute("data-roprime-effect-id");
			const action = btn.getAttribute("data-roprime-effect-action");
			if (!effectId || !action) return;

			const effect = getProfileEffectById(effectId);
			if (!effect) return;

			if (action === "buy") {
				if (isEffectOwned(effectId)) return;
				void (async () => {
					const userId = await refreshAuthUserId();
					if (userId) {
						await registerProfileEffectPurchase(userId, effectId);
					}
					if (!Array.isArray(settingsState.ownedProfileEffects)) {
						settingsState.ownedProfileEffects = [];
					}
					if (!settingsState.ownedProfileEffects.includes(effectId)) {
						settingsState.ownedProfileEffects = [
							...settingsState.ownedProfileEffects,
							effectId,
						];
					}
					if (isPluginOwner(userId)) {
						settingsState.ownedProfileEffects = getAllProfileEffectIds();
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
				return;
			}

			if (action === "equip") {
				if (!isEffectOwned(effectId)) return;
				void (async () => {
					const userId = await refreshAuthUserId();
					setEquippedEffectIdForKind(effect.kind, effectId);
					if (userId) {
						setEquippedForUser(userId, effectId, effect.kind);
						await registerProfileEffectEquip(userId, effectId, effect.kind);
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
				return;
			}

			if (action === "unequip") {
				void (async () => {
					const userId = await refreshAuthUserId();
					if (getEquippedEffectIdForKind(effect.kind) === effectId) {
						setEquippedEffectIdForKind(effect.kind, "");
					}
					if (userId) {
						setEquippedForUser(userId, "", effect.kind);
						await registerProfileEffectEquip(userId, "", effect.kind);
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
			}
		});
	}
}
