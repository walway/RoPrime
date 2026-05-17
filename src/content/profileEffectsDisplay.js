import { settingsState, shouldRunRoPrimeOnCurrentPage } from "./core.js";
import {
	getProfileEffectById,
	getProfileEffectProfileEmbedSrc,
} from "./profileEffectsCatalog.js";
import {
	fetchProfileEffectsRegistry,
	getEquippedEffectForProfileUser,
	getRobloxUserId,
	isPluginOwner,
	userOwnsOnRegistry,
} from "./profileEffectsRegistry.js";

const LAYER_ATTR = "data-roprime-profile-effect-layer";
const LAYER_ID = "roprime-profile-page-effect-layer";

let syncPromise = null;
let observer = null;

export function parseUserProfileIdFromLocation(loc = window.location) {
	const path = loc.pathname || "";
	const match = path.match(
		/^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?users\/(\d+)\/profile(?:\/|$)/i,
	);
	if (!match) return null;
	const userId = Number(match[1]);
	return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function isUserProfilePage(loc = window.location) {
	return parseUserProfileIdFromLocation(loc) != null;
}

function removeProfileEffectLayer() {
	document.getElementById(LAYER_ID)?.remove();
}

function findAvatarHost() {
	return document.querySelector(".avatar.avatar-card-fullbody");
}

async function resolveEquippedEffectId(profileUserId) {
	const authId = await getRobloxUserId();
	const localEquipped =
		authId === profileUserId
			? String(settingsState.equippedProfileEffect || "").trim()
			: "";
	const equippedByUser =
		settingsState.profileEffectsEquippedByUser &&
		typeof settingsState.profileEffectsEquippedByUser === "object"
			? settingsState.profileEffectsEquippedByUser
			: {};

	return getEquippedEffectForProfileUser(
		profileUserId,
		localEquipped,
		equippedByUser,
	);
}

async function profileUserMayShowEffect(profileUserId, effectId) {
	if (!effectId) return false;
	if (!getProfileEffectById(effectId)) return false;
	if (isPluginOwner(profileUserId)) return true;
	const registry = await fetchProfileEffectsRegistry();
	return userOwnsOnRegistry(registry, profileUserId, effectId);
}

function mountProfileEffectLayer(avatarHost, effect) {
	removeProfileEffectLayer();

	const layer = document.createElement("div");
	layer.id = LAYER_ID;
	layer.setAttribute(LAYER_ATTR, effect.id);
	layer.className = "roprime-profile-page-effect-layer";

	const iframe = document.createElement("iframe");
	iframe.src = getProfileEffectProfileEmbedSrc(effect);
	iframe.title = effect.titleKey;
	iframe.loading = "lazy";
	iframe.setAttribute("tabindex", "-1");
	iframe.setAttribute("allowtransparency", "true");
	iframe.style.background = "transparent";
	iframe.style.backgroundColor = "transparent";

	layer.appendChild(iframe);

	if (getComputedStyle(avatarHost).position === "static") {
		avatarHost.style.position = "relative";
	}

	avatarHost.appendChild(layer);
}

async function syncProfilePageEffectNow() {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeProfileEffectLayer();
		return;
	}

	const profileUserId = parseUserProfileIdFromLocation();
	if (!profileUserId) {
		removeProfileEffectLayer();
		return;
	}

	const effectId = await resolveEquippedEffectId(profileUserId);
	if (!effectId || !(await profileUserMayShowEffect(profileUserId, effectId))) {
		removeProfileEffectLayer();
		return;
	}

	const effect = getProfileEffectById(effectId);
	if (!effect) {
		removeProfileEffectLayer();
		return;
	}

	const avatarHost = findAvatarHost();
	if (!avatarHost) return;

	const existing = document.getElementById(LAYER_ID);
	if (
		existing instanceof HTMLElement &&
		existing.parentElement === avatarHost &&
		existing.getAttribute(LAYER_ATTR) === effect.id
	) {
		return;
	}

	mountProfileEffectLayer(avatarHost, effect);
}

export function syncProfilePageEffect() {
	if (syncPromise) return syncPromise;
	syncPromise = syncProfilePageEffectNow().finally(() => {
		syncPromise = null;
	});
	return syncPromise;
}

export function installProfilePageEffectObserver() {
	if (observer) return;
	observer = new MutationObserver(() => {
		void syncProfilePageEffect();
	});
	const start = () => {
		if (!document.body) return;
		observer.observe(document.body, { childList: true, subtree: true });
		void syncProfilePageEffect();
	};
	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start, { once: true });
}
