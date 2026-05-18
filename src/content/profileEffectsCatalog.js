/**
 * @typedef {"picture" | "profile"} ProfileEffectKind
 * @typedef {{ id: string, kind: ProfileEffectKind, cdnEffect?: string, titleKey: string }} ProfileEffect
 */

const PROFILE_EFFECT_CDN_BASE =
	"https://walway.github.io/cdn/index.html";

/** CDN slug for ?effect= (e.g. yawning512 → yawning, clockwork → clockwork). */
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

/** @type {ProfileEffect[]} */
export const PROFILE_PICTURE_EFFECTS = [
	{
		id: "yawning512",
		kind: "picture",
		cdnEffect: "yawning",
		titleKey: "Profile effect yawning title",
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
		getProfileEffectsCatalog().find((effect) => effect.id === effectId) ||
		null
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
