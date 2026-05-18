import { getExtensionResourceUrl } from "./core.js";

const YAWNING_LOTTIE_FILE =
	"eb451679-9120-462c-94cb-16c8291595a7/C1AjrRwsTE.lottie";
const YAWNING_SHOP_EMBED_PAGE = "resources/lottie/yawning-embed.html";
const YAWNING_PROFILE_EMBED_PAGE = "resources/lottie/yawning-profile-embed.html";
const YAWNING_LOTTIE_HOST_FALLBACK = `https://lottie.host/embed/${YAWNING_LOTTIE_FILE}`;
/** lottie.host transparent player — avoids white canvas in extension iframes on profile. */
const YAWNING_PROFILE_EMBED_URL = `${YAWNING_LOTTIE_HOST_FALLBACK}?background=transparent`;

const CLOCKWORK_SHOP_EMBED_PAGE = "resources/lottie/clockwork-embed.html";
const CLOCKWORK_PROFILE_EMBED_PAGE = "resources/lottie/clockwork-profile-embed.html";

/**
 * @typedef {"picture" | "profile"} ProfileEffectKind
 * @typedef {{ id: string, kind: ProfileEffectKind, embedPage: string, profileEmbedUrl?: string, profileEmbedPage: string, titleKey: string }} ProfileEffect
 */

/** @type {ProfileEffect[]} */
export const PROFILE_PICTURE_EFFECTS = [
	{
		id: "yawning512",
		kind: "picture",
		embedPage: YAWNING_SHOP_EMBED_PAGE,
		profileEmbedUrl: YAWNING_PROFILE_EMBED_URL,
		profileEmbedPage: YAWNING_PROFILE_EMBED_PAGE,
		titleKey: "Profile effect yawning title",
	},
];

/** Full-profile Lottie effects (local JSON embeds). */
/** @type {ProfileEffect[]} */
export const PROFILE_EFFECTS = [
	{
		id: "clockwork",
		kind: "profile",
		embedPage: CLOCKWORK_SHOP_EMBED_PAGE,
		profileEmbedPage: CLOCKWORK_PROFILE_EMBED_PAGE,
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

export function getProfileEffectEmbedSrc(embedPage) {
	return getExtensionResourceUrl(embedPage) || YAWNING_LOTTIE_HOST_FALLBACK;
}

/** Transparent embed for Roblox profile avatar overlay or full-profile layer. */
export function getProfileEffectProfileEmbedSrc(effect) {
	if (effect?.profileEmbedUrl) return effect.profileEmbedUrl;
	const page = effect?.profileEmbedPage;
	if (page) {
		const local = getExtensionResourceUrl(page);
		if (local) return local;
	}
	return YAWNING_PROFILE_EMBED_URL;
}
