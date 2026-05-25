import { saveSettings, settingsState } from "../core/core.js";
import { hydrateProfilePictureEffectAvatars } from "../profile/profileEffectAvatar.js";
import {
	getAllProfileEffectIds,
	getProfileEffectById,
	getProfileEffectShopEmbedSrc,
	PROFILE_EFFECT_IFRAME_TRANSPARENT_ATTRS,
	PROFILE_EFFECTS,
	PROFILE_PICTURE_EFFECTS,
} from "../profile/profileEffectsCatalog.js";
import {
	equipSlotForKind,
	getRobloxUserId,
	isPluginOwner,
	isSupabaseProfileEffectsEnabled,
	normalizeEquippedEntry,
	registerProfileEffectEquip,
	registerProfileEffectPurchase,
	syncOwnedEffectsFromRegistry,
} from "../profile/profileEffectsRegistry.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

let cachedAuthUserId = null;
let profileEffectNoticeTimer = 0;

function showProfileEffectPurchaseNotice() {
	const message = accountSettingsPaneT("Profile effect purchase wait notice");
	let notice = document.getElementById("roprime-profile-effect-notice");
	if (!(notice instanceof HTMLElement)) {
		notice = document.createElement("div");
		notice.id = "roprime-profile-effect-notice";
		notice.className = "roprime-profile-effect-notice";
		notice.setAttribute("role", "status");
		notice.setAttribute("aria-live", "polite");
		document.body.appendChild(notice);
	}
	notice.textContent = message;
	notice.classList.add("is-visible");
	if (profileEffectNoticeTimer) {
		window.clearTimeout(profileEffectNoticeTimer);
	}
	profileEffectNoticeTimer = window.setTimeout(() => {
		notice.classList.remove("is-visible");
		profileEffectNoticeTimer = 0;
	}, 10000);
}

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
		for (const slot of /** @type {const} */ (["picture", "profile"])) {
			const id = normalized[slot];
			if (!id) continue;
			const effect = getProfileEffectById(id);
			if (!effect || effect.kind === slot) continue;
			const other = slot === "picture" ? "profile" : "picture";
			if (!normalized[other]) normalized[other] = id;
			normalized[slot] = "";
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
		migrateLegacyEquippedProfileEffect() || migrateLegacyEquippedByUserMap();
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

const PROFILE_EFFECT_LAYOUTS = ["grid", "list", "wide"];

const PROFILE_EFFECT_LAYOUT_ICONS = {
	grid: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 3v8h8V3H3zm6 6V5H5v4h4zm-6 4v8h8v-8H3zm6 6v-4H5v4h4zm4-16v8h8V3h-8zm6 6V5h-4v4h4zm-6 4v8h8v-8h-8zm6 6v-4h-4v4h4z"/></svg>`,
	list: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>`,
	wide: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v3h-5c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2h5v3z"/></svg>`,
};

export function buildProfileEffectsMarkup(effects = PROFILE_EFFECTS) {
	return effects
		.map(
			(effect) => `
		<article class="roprime-profile-effect-card" data-roprime-profile-effect="${effect.id}" data-roprime-profile-effect-kind="${effect.kind}">
			<div class="roprime-profile-effect-preview">
				${effect.kind === "picture" ? '<div class="roprime-profile-effect-avatar-wrap" data-roprime-profile-effect-avatar aria-hidden="true"></div>' : ""}
				<div class="roprime-profile-effect-lottie">
					<iframe src="${getProfileEffectShopEmbedSrc(effect)}" title="${effect.titleKey}" loading="lazy" ${PROFILE_EFFECT_IFRAME_TRANSPARENT_ATTRS}></iframe>
				</div>
			</div>
			<div class="roprime-profile-effect-footer">
				<div class="roprime-profile-effect-title" data-i18n="${effect.titleKey}"></div>
				<button type="button" class="roprime-settings-primary-btn roprime-profile-effect-action" data-roprime-effect-id="${effect.id}" data-roprime-effect-action="buy" data-i18n="Buy profile effect"></button>
			</div>
		</article>`,
		)
		.join("");
}

function buildProfileEffectsLayoutToolbarHtml() {
	const layout = settingsState.profileEffectsLayoutView || "grid";
	const buttons = PROFILE_EFFECT_LAYOUTS.map((view) => {
		const titleKey =
			view === "grid"
				? "Profile effects layout grid"
				: view === "list"
					? "Profile effects layout list"
					: "Profile effects layout wide";
		return `<button type="button" class="roprime-profile-effects-layout-btn${view === layout ? " is-active" : ""}" data-roprime-profile-effects-layout="${view}" data-i18n-aria-label="${titleKey}" aria-pressed="${view === layout ? "true" : "false"}">${PROFILE_EFFECT_LAYOUT_ICONS[view]}</button>`;
	}).join("");
	const indicators = PROFILE_EFFECT_LAYOUTS.map(
		(view) =>
			`<span class="roprime-profile-effects-layout-indicator-dot${view === layout ? " is-active" : ""}" data-roprime-layout-indicator="${view}" aria-hidden="true"></span>`,
	).join("");
	return `
		<div class="roprime-profile-effects-toolbar">
			<input type="search" class="roprime-profile-effects-search" data-roprime-profile-effects-search data-i18n-placeholder="Profile effects search placeholder" autocomplete="off" />
			<div class="roprime-profile-effects-layout">
				<div class="roprime-profile-effects-layout-buttons" role="group" data-i18n-aria-label="Profile effects layout">
					${buttons}
				</div>
				<div class="roprime-profile-effects-layout-indicator">${indicators}</div>
			</div>
		</div>`;
}

function buildProfileEffectsSectionHtml(titleKey, descKey, effects) {
	return `
		<div class="roprime-cosmetics-shop-section">
			<h3 class="roprime-settings-section-title" data-i18n="${titleKey}"></h3>
			<p class="roprime-setting-desc" data-i18n="${descKey}"></p>
			<div class="roprime-profile-effects-grid" data-roprime-profile-effects-grid>
				${buildProfileEffectsMarkup(effects)}
			</div>
		</div>`;
}

export function buildCosmeticsShopHtml() {
	return `
		${buildProfileEffectsLayoutToolbarHtml()}
		${buildProfileEffectsSectionHtml(
			"Profile picture effects title",
			"Profile picture effects description",
			PROFILE_PICTURE_EFFECTS,
		)}
		${buildProfileEffectsSectionHtml(
			"Profile effects title",
			"Profile effects description",
			PROFILE_EFFECTS,
		)}`;
}

function normalizeProfileEffectsLayoutView(layout) {
	return PROFILE_EFFECT_LAYOUTS.includes(layout) ? layout : "grid";
}

function applyProfileEffectsLayout(shop, layout) {
	const view = normalizeProfileEffectsLayoutView(layout);
	shop
		.querySelectorAll("[data-roprime-profile-effects-grid]")
		.forEach((grid) => {
			if (!(grid instanceof HTMLElement)) return;
			grid.classList.remove(
				"roprime-profile-effects-grid--list",
				"roprime-profile-effects-grid--wide",
			);
			if (view === "list")
				grid.classList.add("roprime-profile-effects-grid--list");
			if (view === "wide")
				grid.classList.add("roprime-profile-effects-grid--wide");
		});
	shop
		.querySelectorAll("[data-roprime-profile-effects-layout]")
		.forEach((btn) => {
			if (!(btn instanceof HTMLButtonElement)) return;
			const active =
				btn.getAttribute("data-roprime-profile-effects-layout") === view;
			btn.classList.toggle("is-active", active);
			btn.setAttribute("aria-pressed", String(active));
		});
	shop.querySelectorAll("[data-roprime-layout-indicator]").forEach((dot) => {
		if (!(dot instanceof HTMLElement)) return;
		dot.classList.toggle(
			"is-active",
			dot.getAttribute("data-roprime-layout-indicator") === view,
		);
	});
}

function filterProfileEffectsSearch(shop, query) {
	const q = String(query || "")
		.trim()
		.toLowerCase();
	shop.querySelectorAll("[data-roprime-profile-effect]").forEach((card) => {
		if (!(card instanceof HTMLElement)) return;
		const effectId = card.getAttribute("data-roprime-profile-effect") || "";
		const effect = getProfileEffectById(effectId);
		const title = effect
			? accountSettingsPaneT(effect.titleKey).toLowerCase()
			: "";
		const hidden = !!q && !title.includes(q);
		card.hidden = hidden;
		card.classList.toggle("roprime-profile-effect-card--hidden", hidden);
	});
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

	applyProfileEffectsLayout(
		shop,
		settingsState.profileEffectsLayoutView || "grid",
	);
	const search = shop.querySelector("[data-roprime-profile-effects-search]");
	if (search instanceof HTMLInputElement) {
		filterProfileEffectsSearch(shop, search.value);
	}

	void refreshAuthUserId().then(() => {
		normalizeEquippedProfileEffects();
		syncEffectButtons(shop);
	});
	void ensureRegistryOwnershipSynced().then(() => {
		normalizeEquippedProfileEffects();
		syncEffectButtons(shop);
	});
	void hydrateProfilePictureEffectAvatars(shop);
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
		const search = shop.querySelector("[data-roprime-profile-effects-search]");
		if (search instanceof HTMLInputElement) {
			search.addEventListener("input", () => {
				filterProfileEffectsSearch(shop, search.value);
			});
		}

		shop
			.querySelectorAll("[data-roprime-profile-effects-layout]")
			.forEach((btn) => {
				if (!(btn instanceof HTMLButtonElement)) return;
				btn.addEventListener("click", () => {
					const layout = btn.getAttribute(
						"data-roprime-profile-effects-layout",
					);
					if (!layout) return;
					settingsState.profileEffectsLayoutView =
						normalizeProfileEffectsLayoutView(layout);
					saveSettings();
					applyProfileEffectsLayout(
						shop,
						settingsState.profileEffectsLayoutView,
					);
				});
			});

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
					let purchaseSaved = false;
					if (userId) {
						purchaseSaved = await registerProfileEffectPurchase(
							userId,
							effectId,
						);
					}
					if (isSupabaseProfileEffectsEnabled() && !purchaseSaved) {
						console.warn(
							"RoPrime: purchase not saved to Supabase — check schema and .env",
						);
						return;
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
					showProfileEffectPurchaseNotice();
				})();
				return;
			}

			if (action === "equip") {
				if (!isEffectOwned(effectId)) return;
				void (async () => {
					const userId = await refreshAuthUserId();
					let equipSaved = true;
					if (userId) {
						equipSaved = await registerProfileEffectEquip(
							userId,
							effectId,
							effect.kind,
						);
					}
					if (isSupabaseProfileEffectsEnabled() && !equipSaved) {
						console.warn(
							"RoPrime: equip not saved to Supabase — check schema and .env",
						);
						return;
					}
					setEquippedEffectIdForKind(effect.kind, effectId);
					if (userId) {
						setEquippedForUser(userId, effectId, effect.kind);
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
				return;
			}

			if (action === "unequip") {
				void (async () => {
					const userId = await refreshAuthUserId();
					let equipSaved = true;
					if (userId) {
						equipSaved = await registerProfileEffectEquip(
							userId,
							"",
							effect.kind,
						);
					}
					if (isSupabaseProfileEffectsEnabled() && !equipSaved) {
						console.warn(
							"RoPrime: unequip not saved to Supabase — check schema and .env",
						);
						return;
					}
					if (getEquippedEffectIdForKind(effect.kind) === effectId) {
						setEquippedEffectIdForKind(effect.kind, "");
					}
					if (userId) {
						setEquippedForUser(userId, "", effect.kind);
					}
					saveSettings();
					syncCosmeticsUi(inner);
				})();
			}
		});
	}
}
