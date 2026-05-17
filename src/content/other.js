import { saveSettings, settingsState } from "./core.js";
import {
	getAllProfileEffectIds,
	getProfileEffectEmbedSrc,
	PROFILE_EFFECTS,
} from "./profileEffectsCatalog.js";
import {
	getRobloxUserId,
	isPluginOwner,
	registerProfileEffectEquip,
	registerProfileEffectPurchase,
	syncOwnedEffectsFromRegistry,
} from "./profileEffectsRegistry.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

let cachedAuthUserId = null;

function isEffectOwned(effectId) {
	if (isPluginOwner(cachedAuthUserId)) return true;
	return (
		Array.isArray(settingsState.ownedProfileEffects) &&
		settingsState.ownedProfileEffects.includes(effectId)
	);
}

function isEffectEquipped(effectId) {
	return settingsState.equippedProfileEffect === effectId;
}

function normalizeEquippedProfileEffect() {
	const equipped = String(settingsState.equippedProfileEffect || "").trim();
	if (!equipped) {
		settingsState.equippedProfileEffect = "";
		return;
	}
	if (!isEffectOwned(equipped)) {
		settingsState.equippedProfileEffect = "";
	}
}

function setEquippedForUser(userId, effectId) {
	if (!userId) return;
	const key = String(userId);
	if (!settingsState.profileEffectsEquippedByUser) {
		settingsState.profileEffectsEquippedByUser = {};
	}
	if (effectId) {
		settingsState.profileEffectsEquippedByUser[key] = effectId;
	} else {
		delete settingsState.profileEffectsEquippedByUser[key];
	}
}

export function buildProfileEffectsMarkup() {
	return PROFILE_EFFECTS.map(
		(effect) => `
		<article class="roprime-profile-effect-card" data-roprime-profile-effect="${effect.id}">
			<div class="roprime-profile-effect-preview">
				<div class="roprime-profile-effect-lottie">
					<iframe src="${getProfileEffectEmbedSrc(effect.embedPage)}" title="${effect.titleKey}" loading="lazy"></iframe>
				</div>
			</div>
			<div class="roprime-profile-effect-footer">
				<div class="roprime-profile-effect-title" data-i18n="${effect.titleKey}"></div>
				<button type="button" class="roprime-settings-primary-btn roprime-profile-effect-action" data-roprime-effect-id="${effect.id}" data-roprime-effect-action="buy" data-i18n="Buy profile effect"></button>
			</div>
		</article>`,
	).join("");
}

export { PROFILE_EFFECTS };

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
		normalizeEquippedProfileEffect();
		if (changed) saveSettings();
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
		normalizeEquippedProfileEffect();
		syncEffectButtons(shop);
	});
	void ensureRegistryOwnershipSynced().then(() => {
		normalizeEquippedProfileEffect();
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
					settingsState.equippedProfileEffect = effectId;
					if (userId) {
						setEquippedForUser(userId, effectId);
						await registerProfileEffectEquip(userId, effectId);
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
				return;
			}

			if (action === "unequip") {
				void (async () => {
					const userId = await refreshAuthUserId();
					if (settingsState.equippedProfileEffect === effectId) {
						settingsState.equippedProfileEffect = "";
					}
					if (userId) {
						setEquippedForUser(userId, "");
						await registerProfileEffectEquip(userId, "");
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
			}
		});
	}
}
