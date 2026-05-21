import { getProfileEffectById } from "./profileEffectsCatalog.js";
import { getRobloxUserId } from "./profileEffectsRegistry.js";

const HEADSHOT_API =
	"https://thumbnails.roblox.com/v1/users/avatar-headshot";

/**
 * @param {number} userId
 * @returns {Promise<{ imageUrl: string, displayName: string, username: string } | null>}
 */
export async function fetchAuthUserHeadshot(userId) {
	const id = Number(userId);
	if (!Number.isFinite(id) || id <= 0) return null;

	let displayName = "";
	let username = "";

	try {
		const userRes = await fetch(
			`https://users.roblox.com/v1/users/${id}`,
			{ credentials: "include" },
		);
		if (userRes.ok) {
			const user = await userRes.json();
			displayName = String(user?.displayName || user?.name || "").trim();
			username = String(user?.name || "").trim();
		}
	} catch {
		/* optional */
	}

	try {
		const thumbRes = await fetch(
			`${HEADSHOT_API}?userIds=${id}&size=150x150&format=Png&isCircular=false`,
			{ credentials: "include" },
		);
		if (!thumbRes.ok) return null;
		const thumbJson = await thumbRes.json();
		const imageUrl = String(thumbJson?.data?.[0]?.imageUrl || "").trim();
		if (!imageUrl) return null;
		return {
			imageUrl,
			displayName: displayName || username || "User",
			username,
		};
	} catch {
		return null;
	}
}

/**
 * Roblox profile header avatar markup (matches live site structure).
 * @param {{ imageUrl: string, displayName: string }} profile
 */
export function buildRobloxAvatarHeadshotHtml(profile) {
	const alt = profile.displayName.replace(/"/g, "&quot;");
	const src = profile.imageUrl.replace(/"/g, "&quot;");
	return `<div class="user-profile-header-details-avatar-container avatar-headshot-lg roprime-effect-shop-avatar"><div class="avatar avatar-card-fullbody" data-testid="avatar-card-container"><span class="thumbnail-2d-container avatar-card-image"><img src="${src}" alt="${alt}" title="${alt}" loading="lazy" /></span></div></div>`;
}

/**
 * @param {HTMLElement} shop
 */
export async function hydrateProfilePictureEffectAvatars(shop) {
	const userId = await getRobloxUserId();
	if (!userId) return;

	const profile = await fetchAuthUserHeadshot(userId);
	if (!profile) return;

	const avatarHtml = buildRobloxAvatarHeadshotHtml(profile);

	for (const card of shop.querySelectorAll("[data-roprime-profile-effect]")) {
		if (!(card instanceof HTMLElement)) continue;
		const effectId = card.getAttribute("data-roprime-profile-effect") || "";
		const effect = getProfileEffectById(effectId);
		if (!effect || effect.kind !== "picture") continue;

		const preview = card.querySelector(".roprime-profile-effect-preview");
		if (!(preview instanceof HTMLElement)) continue;

		let wrap = preview.querySelector(".roprime-profile-effect-avatar-wrap");
		if (!(wrap instanceof HTMLElement)) {
			wrap = document.createElement("div");
			wrap.className = "roprime-profile-effect-avatar-wrap";
			preview.appendChild(wrap);
		}
		wrap.innerHTML = avatarHtml;
	}
}
