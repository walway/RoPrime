import { settingsState } from "../core/core.js";
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

/**
 * @param {string | number} profileUserId
 * @returns {Promise<{ picture: string, profile: string }>}
 */
export async function resolveLocalEquippedByKind(profileUserId) {
	const authId = await getRobloxUserId();
	if (authId !== profileUserId) {
		return { picture: "", profile: "" };
	}
	return {
		picture: String(settingsState.equippedProfilePictureEffect || "").trim(),
		profile: String(settingsState.equippedProfilePageEffect || "").trim(),
	};
}

/**
 * @param {string | number} profileUserId
 * @param {"picture" | "profile"} kind
 */
export async function resolveEquippedEffectId(profileUserId, kind) {
	const localEquipped = await resolveLocalEquippedByKind(profileUserId);
	const equippedByUser =
		settingsState.profileEffectsEquippedByUser &&
		typeof settingsState.profileEffectsEquippedByUser === "object"
			? settingsState.profileEffectsEquippedByUser
			: {};

	const effectId = await getEquippedEffectForProfileUser(
		profileUserId,
		kind,
		localEquipped,
		equippedByUser,
	);
	if (!effectId) return "";

	const effect = getProfileEffectById(effectId);
	if (!effect || effect.kind !== kind) return "";

	return effectId;
}

export async function profileUserMayShowEffect(profileUserId, effectId) {
	if (!effectId) return false;
	if (!getProfileEffectById(effectId)) return false;
	if (isPluginOwner(profileUserId)) return true;
	const registry = await fetchProfileEffectsRegistry();
	return userOwnsOnRegistry(registry, profileUserId, effectId);
}

/**
 * @param {HTMLElement} host
 * @param {import("./profileEffectsCatalog.js").ProfileEffect} effect
 * @param {{ layerId: string, layerClass: string, layerAttr: string }} options
 */
export function mountProfileEffectLayer(host, effect, options) {
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

export function layerIsCurrent(host, layerId, layerAttr, effectId) {
	const existing = document.getElementById(layerId);
	return (
		existing instanceof HTMLElement &&
		existing.parentElement === host &&
		existing.getAttribute(layerAttr) === effectId
	);
}
