import { getExtensionResourceUrl } from "./core.js";

const YAWNING_LOTTIE_FILE =
	"eb451679-9120-462c-94cb-16c8291595a7/C1AjrRwsTE.lottie";
const YAWNING_SHOP_EMBED_PAGE = "resources/lottie/yawning-embed.html";
const YAWNING_PROFILE_EMBED_PAGE = "resources/lottie/yawning-profile-embed.html";
const YAWNING_LOTTIE_HOST_FALLBACK = `https://lottie.host/embed/${YAWNING_LOTTIE_FILE}`;
/** lottie.host transparent player — avoids white canvas in extension iframes on profile. */
const YAWNING_PROFILE_EMBED_URL = `${YAWNING_LOTTIE_HOST_FALLBACK}?background=transparent`;

/**
 * @type {{ id: string, embedPage: string, profileEmbedUrl: string, profileEmbedPage: string, titleKey: string }[]}
 */
export const PROFILE_EFFECTS = [
	{
		id: "yawning512",
		embedPage: YAWNING_SHOP_EMBED_PAGE,
		profileEmbedUrl: YAWNING_PROFILE_EMBED_URL,
		profileEmbedPage: YAWNING_PROFILE_EMBED_PAGE,
		titleKey: "Profile effect yawning title",
	},
];

export function getAllProfileEffectIds() {
	return PROFILE_EFFECTS.map((effect) => effect.id);
}

export function getProfileEffectById(effectId) {
	return PROFILE_EFFECTS.find((effect) => effect.id === effectId) || null;
}

export function getProfileEffectEmbedSrc(embedPage) {
	return getExtensionResourceUrl(embedPage) || YAWNING_LOTTIE_HOST_FALLBACK;
}

/** Transparent embed for Roblox profile avatar overlay. */
export function getProfileEffectProfileEmbedSrc(effect) {
	if (effect?.profileEmbedUrl) return effect.profileEmbedUrl;
	const page = effect?.profileEmbedPage;
	if (page) {
		const local = getExtensionResourceUrl(page);
		if (local) return local;
	}
	return YAWNING_PROFILE_EMBED_URL;
}
