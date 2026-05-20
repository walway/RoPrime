import { settingsState, shouldRunRoPrimeOnCurrentPage } from "./core.js";
import {
	configureProfileEffectIframe,
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

const PICTURE_LAYER_ATTR = "data-roprime-profile-picture-effect-layer";
const PICTURE_LAYER_ID = "roprime-profile-page-effect-layer";
const PROFILE_LAYER_ATTR = "data-roprime-profile-effect-layer";
const PROFILE_LAYER_ID = "roprime-profile-page-profile-effect-layer";

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

function removeProfileEffectLayers() {
	document.getElementById(PICTURE_LAYER_ID)?.remove();
	document.getElementById(PROFILE_LAYER_ID)?.remove();
}

function findAvatarHost() {
	return document.querySelector(".avatar.avatar-card-fullbody");
}

function findProfilePageEffectHost() {
	return document.querySelector(".user-profile-header.flex.flex-col.gap-large");
}

async function resolveLocalEquippedByKind(profileUserId) {
	const authId = await getRobloxUserId();
	if (authId !== profileUserId) {
		return { picture: "", profile: "" };
	}
	return {
		picture: String(settingsState.equippedProfilePictureEffect || "").trim(),
		profile: String(settingsState.equippedProfilePageEffect || "").trim(),
	};
}

async function resolveEquippedEffectId(profileUserId, kind) {
	const localEquipped = await resolveLocalEquippedByKind(profileUserId);
	const equippedByUser =
		settingsState.profileEffectsEquippedByUser &&
		typeof settingsState.profileEffectsEquippedByUser === "object"
			? settingsState.profileEffectsEquippedByUser
			: {};

	return getEquippedEffectForProfileUser(
		profileUserId,
		kind,
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

function mountProfileEffectLayer(host, effect, options) {
	const { layerId, layerClass, layerAttr } = options;

	const layer = document.createElement("div");
	layer.id = layerId;
	layer.setAttribute(layerAttr, effect.id);
	layer.className = layerClass;

	const iframe = document.createElement("iframe");
	iframe.src = getProfileEffectProfileEmbedSrc(effect);
	iframe.title = effect.titleKey;
	iframe.loading = "lazy";
	iframe.setAttribute("tabindex", "-1");
	configureProfileEffectIframe(iframe);

	layer.appendChild(iframe);

	if (getComputedStyle(host).position === "static") {
		host.style.position = "relative";
	}

	host.appendChild(layer);
}

function layerIsCurrent(host, layerId, layerAttr, effectId) {
	const existing = document.getElementById(layerId);
	return (
		existing instanceof HTMLElement &&
		existing.parentElement === host &&
		existing.getAttribute(layerAttr) === effectId
	);
}

async function syncEquippedKindLayer(profileUserId, kind) {
	const layerId = kind === "picture" ? PICTURE_LAYER_ID : PROFILE_LAYER_ID;
	const layerAttr =
		kind === "picture" ? PICTURE_LAYER_ATTR : PROFILE_LAYER_ATTR;
	const layerClass =
		kind === "picture"
			? "roprime-profile-page-effect-layer"
			: "roprime-profile-page-profile-effect-layer";

	const effectId = await resolveEquippedEffectId(profileUserId, kind);
	if (!effectId || !(await profileUserMayShowEffect(profileUserId, effectId))) {
		document.getElementById(layerId)?.remove();
		return;
	}

	const effect = getProfileEffectById(effectId);
	if (!effect || effect.kind !== kind) {
		document.getElementById(layerId)?.remove();
		return;
	}

	const host =
		kind === "picture" ? findAvatarHost() : findProfilePageEffectHost();
	if (!host) return;

	if (layerIsCurrent(host, layerId, layerAttr, effect.id)) return;

	document.getElementById(layerId)?.remove();
	mountProfileEffectLayer(host, effect, {
		layerId,
		layerClass,
		layerAttr,
	});
}

async function syncProfilePageEffectNow() {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeProfileEffectLayers();
		return;
	}

	const profileUserId = parseUserProfileIdFromLocation();
	if (!profileUserId) {
		removeProfileEffectLayers();
		return;
	}

	await syncEquippedKindLayer(profileUserId, "picture");
	await syncEquippedKindLayer(profileUserId, "profile");
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
