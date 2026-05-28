const PROFILE_EFFECT_CDN_BASE = "https://walway.github.io/cdn/index.html";

export function getProfileEffectCdnName(effect) {
	if (!effect) return "";
	if (effect.cdnEffect) return String(effect.cdnEffect);
	const id = String(effect.id || "");
	return id.replace(/\d+$/, "") || id;
}

export function getProfileEffectCdnEmbedSrc(
	effect,
	query = null,
	target = "profile",
) {
	const name = getProfileEffectCdnName(effect);
	const url = new URL(PROFILE_EFFECT_CDN_BASE);
	if (name) url.searchParams.set("effect", name);
	url.searchParams.set(
		"target",
		target === "settings" ? "settings" : "profile",
	);
	url.searchParams.set("source", "iframe");
	if (query && typeof query === "object") {
		for (const [key, value] of Object.entries(query)) {
			if (value == null || value === "") continue;
			url.searchParams.set(String(key), String(value));
		}
	}
	return url.toString();
}

export const PROFILE_EFFECT_IFRAME_TRANSPARENT_ATTRS =
	'allowtransparency="true" style="background:transparent;background-color:transparent"';

export function configureProfileEffectIframe(iframe) {
	iframe.setAttribute("allowtransparency", "true");
	iframe.setAttribute("frameborder", "0");
	iframe.setAttribute("scrolling", "no");
	iframe.style.background = "transparent";
	iframe.style.backgroundColor = "transparent";
}

export function applyProfileEffectIframeTransparentAttrs(iframe) {
	configureProfileEffectIframe(iframe);
}

export const PROFILE_PICTURE_EFFECTS = [
	{
		id: "dizzy",
		kind: "picture",
		titleKey: "Profile effect dizzy title",
	},
];

export const PROFILE_EFFECTS = [
	{
		id: "clockwork",
		kind: "profile",
		titleKey: "Profile effect clockwork title",
	},
	{
		id: "heartbroken",
		kind: "profile",
		titleKey: "Profile effect heartbroken title",
	},
	{
		id: "highvoltage",
		kind: "profile",
		titleKey: "Profile effect highvoltage title",
	},
	{
		id: "laughing",
		kind: "profile",
		titleKey: "Profile effect laughing title",
	},
	{
		id: "monkeys",
		kind: "profile",
		titleKey: "Profile effect monkeys title",
	},
	{
		id: "neutral",
		kind: "profile",
		titleKey: "Profile effect neutral title",
	},
	{
		id: "supersnow",
		kind: "profile",
		titleKey: "Profile effect supersnow title",
	},
	{
		id: "trophy",
		kind: "profile",
		titleKey: "Profile effect trophy title",
	},
	{
		id: "ufo",
		kind: "profile",
		titleKey: "Profile effect ufo title",
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
	return getProfileEffectCdnEmbedSrc(effect, null, "settings");
}

export function getProfileEffectProfileEmbedSrc(effect) {
	if (effect?.kind === "profile") {
		return getProfileEffectCdnEmbedSrc(effect, {
			loop: "0",
			cooldown: "5000",
			replayDelay: "5000",
		});
	}
	return getProfileEffectCdnEmbedSrc(effect, null, "profile");
}
