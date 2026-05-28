import { getProfileEffectById } from "./profileEffectsCatalog.js";
import { getRobloxUserId } from "./robloxUserId.js";

const HEADSHOT_API = "https://thumbnails.roblox.com/v1/users/avatar-headshot";
const HEADSHOT_CACHE_TTL_MS = 15 * 60 * 1000;

const headshotCache = new Map();

const headshotFetchInFlight = new Map();

export async function fetchAuthUserHeadshot(userId) {
	const id = Number(userId);
	if (!Number.isFinite(id) || id <= 0) return null;

	const cached = headshotCache.get(id);
	if (cached && Date.now() - cached.at < HEADSHOT_CACHE_TTL_MS) {
		return cached.profile;
	}

	const inFlight = headshotFetchInFlight.get(id);
	if (inFlight) return inFlight;

	const promise = (async () => {
		let displayName = "";
		let username = "";

		try {
			const userRes = await fetch(`https://users.roblox.com/v1/users/${id}`, {
				credentials: "include",
			});
			if (userRes.status === 429) {
				return cached?.profile ?? null;
			}
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
			if (thumbRes.status === 429) {
				return cached?.profile ?? null;
			}
			if (!thumbRes.ok) {
				headshotCache.set(id, { profile: null, at: Date.now() });
				return null;
			}
			const thumbJson = await thumbRes.json();
			const imageUrl = String(thumbJson?.data?.[0]?.imageUrl || "").trim();
			if (!imageUrl) {
				headshotCache.set(id, { profile: null, at: Date.now() });
				return null;
			}
			const profile = {
				imageUrl,
				displayName: displayName || username || "User",
				username,
			};
			headshotCache.set(id, { profile, at: Date.now() });
			return profile;
		} catch {
			return cached?.profile ?? null;
		}
	})();

	headshotFetchInFlight.set(id, promise);
	try {
		return await promise;
	} finally {
		headshotFetchInFlight.delete(id);
	}
}

export function buildRobloxAvatarHeadshotHtml(profile) {
	const alt = profile.displayName.replace(/"/g, "&quot;");
	const src = profile.imageUrl.replace(/"/g, "&quot;");
	return `<div class="user-profile-header-details-avatar-container avatar-headshot-lg roprime-effect-shop-avatar"><div class="avatar avatar-card-fullbody" data-testid="avatar-card-container"><span class="thumbnail-2d-container avatar-card-image"><img src="${src}" alt="${alt}" title="${alt}" loading="lazy" /></span></div></div>`;
}

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
