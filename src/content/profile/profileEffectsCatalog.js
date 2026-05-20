/**
 * @typedef {"picture" | "profile"} ProfileEffectKind
 * @typedef {{ id: string, kind: ProfileEffectKind, cdnEffect?: string, titleKey: string }} ProfileEffect
 */

const PROFILE_EFFECT_CDN_BASE = "https://walway.github.io/cdn/";

/** CDN slug for ?effect= (e.g. dizzy512 → dizzy, clockwork → clockwork). */
export function getProfileEffectCdnName(effect) {
	if (!effect) return "";
	if (effect.cdnEffect) return String(effect.cdnEffect);
	const id = String(effect.id || "");
	return id.replace(/\d+$/, "") || id;
}

export function getProfileEffectCdnEmbedSrc(effect) {
	const name = getProfileEffectCdnName(effect);
	if (!name) return PROFILE_EFFECT_CDN_BASE;
	return `${PROFILE_EFFECT_CDN_BASE}?effect=${encodeURIComponent(name)}`;
}

/** Inline attrs for shop preview iframes (allowTransparency + transparent chrome). */
export const PROFILE_EFFECT_IFRAME_TRANSPARENT_ATTRS =
	'allowtransparency="true" style="background:transparent;background-color:transparent"';

/** @param {HTMLIFrameElement} iframe */
export function configureProfileEffectIframe(iframe) {
	iframe.setAttribute("allowtransparency", "true");
	iframe.style.background = "transparent";
	iframe.style.backgroundColor = "transparent";
}

/** @type {ProfileEffect[]} */
export const PROFILE_PICTURE_EFFECTS = [
	{
		id: "dizzy",
		kind: "picture",
		titleKey: "Profile effect dizzy title",
	},
];

/** @type {ProfileEffect[]} */
export const PROFILE_EFFECTS = [
	{
		id: "clockwork",
		kind: "profile",
		titleKey: "Profile effect clockwork title",
	},
];

export function getProfileEffectsCatalog() {
	return [...PROFILE_PICTURE_EFFECTS, ...PROFILE_EFFECTS];
}

export function getAllProfileEffectIds() {
	return getProfileEffectsCatalog().map((effect) => effect.id);
}

export function getProfileEffectById(effectId) {
	return (
		getProfileEffectsCatalog().find((effect) => effect.id === effectId) || null
	);
}

export function getProfileEffectsByKind(kind) {
	return getProfileEffectsCatalog().filter((effect) => effect.kind === kind);
}

export function getProfileEffectShopEmbedSrc(effect) {
	return getProfileEffectCdnEmbedSrc(effect);
}

/** Roblox profile avatar overlay or full-profile layer. */
export function getProfileEffectProfileEmbedSrc(effect) {
	return getProfileEffectCdnEmbedSrc(effect);
}
