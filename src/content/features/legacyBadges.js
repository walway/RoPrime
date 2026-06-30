import { getExtensionResourceUrl } from "../core/core.js";

const ROBLOX_BADGES_API =
	"https://accountinformation.roblox.com/v1/users/{userId}/roblox-badges";
const ROBLOX_BADGES_URL = "https://www.roblox.com/info/roblox-badges";
const BADGES_PER_ROW = 6;
const ROOT_CLASS = "roprime-legacy-badges";
const STYLE_ID = "roprime-legacy-badges-style";

const BADGE_DISPLAY_ORDER = [12, 2, 6, 7, 4, 3, 5, 18, 14, 8, 17];

const BADGE_DISPLAY = {
	12: {
		hash: "veteran",
		title: "Veteran Badge",
		label: "Veteran Badge",
		alt: "veteran",
		imageUrl: "resources/badges/veteran.svg",
	},
	1: {
		hash: "admin",
		title: "Administator Badge",
		label: "Administator Badge",
		alt: "Admin",
		imageUrl: "resources/badges/admin.svg",
	},
	2: {
		hash: "friendship",
		title: "Friendship Badge",
		label: "Friendship Badge",
		alt: "Friendship",
		imageUrl: "resources/badges/friendship.svg",
	},
	6: {
		hash: "homestead",
		title: "Homestead Badge",
		label: "Homestead Badge",
		alt: "Homestead",
		imageUrl: "resources/badges/homestead.svg",
	},
	7: {
		hash: "bricksmith",
		title: "Bricksmith Badge",
		label: "Bricksmith Badge",
		alt: "Bricksmith",
		imageUrl: "resources/badges/bricksmith.svg",
	},
	4: {
		hash: "warrior",
		title: "Warrior",
		label: "Warrior",
		alt: "Warrior",
		imageUrl: "resources/badges/warrior.svg",
	},
	3: {
		hash: "combat",
		title: "Combat Initiation",
		label: "Combat Initiation",
		alt: "Combat Initiation",
		imageUrl: "resources/badges/combat.svg",
	},
	5: {
		hash: "bloxxer",
		title: "Bloxxer Badge",
		label: "Bloxxer Badge",
		alt: "Bloxxer",
		imageUrl: "resources/badges/bloxxer.svg",
	},
	18: {
		hash: "welcome_club",
		title: "Welcome To The Club",
		label: "Welcome To The Club",
		alt: "Welcome To The Club",
		imageUrl: "resources/badges/welcome-to-the-club.svg",
	},
	14: {
		hash: "ambassador",
		title: "Ambassador Badge",
		label: "Ambassador Badge",
		alt: "Ambassador",
		imageUrl: "resources/badges/ambassador.svg",
	},
	8: {
		hash: "inviter",
		title: "Inviter Badge",
		label: "Inviter Badge",
		alt: "Inviter",
		imageUrl: "resources/badges/inviter.svg",
	},
	17: {
		hash: "model_maker",
		title: "Official Model Maker",
		label: "Official Model Maker",
		alt: "Official Model Maker",
		imageUrl: "resources/badges/official-model-maker.svg",
	},
};

const CUSTOM_BADGES = {
	2605032407: [
		{
			title: "We miss you so much",
			label: "We miss you so much 😭",
			alt: "We miss you so much",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-e708f75aa1ec22891113fa67899793ff/420/420/Decal/Webp/noFilter",
		},
		{
			title: "And you too",
			label: "And you too :(",
			alt: "And you too",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-0b2db3d5447c28449c4fa03d6cee6f29/420/420/Decal/Webp/noFilter",
		},
	],

	447170745: [
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
		{
			title: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			label: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			alt: "IM RAT AND I LIKE STEALING YOUR COOKIES",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-bae15f4fd078a8cb4229bee3c0bfebf3/420/420/Decal/Webp/noFilter",
		},
	],
	
	1564574922: [
		{
			title: "Who are you",
			label: "Who are you?",
			alt: "Who are you",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-9219655db8561c2178c7029c0d32d89d/420/420/Decal/Webp/noFilter",
		},
	],

	1912490: [
		{
			title: "GOOnett",
			label: "GOOnett",
			alt: "GOOnett",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-137fd624cf8460aed0a026086d5f2ed8/420/420/Decal/Webp/noFilter",
		},
		{
			title: "Sweety honey",
			label: "Sweety honey",
			alt: "Honey",	
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-b0286ee7e37e59a7e9a1f0f743ec3388/420/420/Decal/Webp/noFilter",
		},
		{
			title: "chill face",
			label: "-‿-",
			alt: "chill face",
			imageUrl:
				"resources/badges/memes/pumpkin-patch.webp",
		},
		{
			title: "aphid",
			label: ">:(",
			alt: "aphid",
			imageUrl:
				"https://tr.rbxcdn.com/180DAY-8435374a6cf890406c8e18631ad95389/420/420/Decal/Webp/noFilter",
		},
		{
			title: "Gummy Bear's Lair",
			label: "Gummy Bear's Lair",
			alt: "Gummy Bear's Lair",
			imageUrl: 
				"resources/badges/memes/goo.png",

		},
		{
				title: "WHERE IS BBM QUEST ONETT",
				label: "WHERE IS BBM QUEST ONETT???",
				alt: "WHERE IS BBM QUEST ONETT",
				imageUrl: 
					"resources/badges/memes/onett-delayer.png",
		},
	],
};

const SEE_MORE_BUTTON =
	'<button type="button" class="btn-fixed-width btn-secondary-xs btn-more see-all-link" data-roprime-see-more>See More</button>';

const BADGES_HTML = `<div class="profile-badges ${ROOT_CLASS}">
<div class="css-17g81zd-collectionCarouselContainer">
	<div class="container-header badge-list-header">
		<h2 class="content-emphasis text-heading-small padding-none inline-block">Roblox Badges</h2>
		{$SEE_MORE_BUTTON}
	</div>
	<div class="roprime-legacy-badges-rows">{$BADGE_ROWS}</div>
</div>
</div>`;

let applyPromise = null;
let profileObserver = null;
let watchTimer = null;

function parseUserIdFromUrl(loc = window.location) {
	const match = (loc.pathname || "").match(
		/^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?users\/(\d+)\/profile(?:\/|$)/i,
	);
	if (!match) return null;
	const userId = Number(match[1]);
	return Number.isFinite(userId) && userId > 0 ? userId : null;
}

function findTabContent() {
	const platform = document.querySelector(".profile-platform-container");
	if (!(platform instanceof HTMLElement)) return null;

	for (const el of platform.querySelectorAll(".profile-tab-content")) {
		if (el.classList.contains("padding-top-xxlarge")) return el;
	}

	return platform.querySelector(".profile-tab-content");
}

function findExistingBadges(userId) {
	return document.querySelector(
		`.${ROOT_CLASS}[data-roprime-user-id="${userId}"]`,
	);
}

function ensureStyles() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
.${ROOT_CLASS} .roprime-legacy-badges-rows { display: flex; flex-direction: column; }
.${ROOT_CLASS} .roprime-legacy-badges-row { display: grid; grid-template-columns: repeat(${BADGES_PER_ROW}, minmax(0, 1fr)); gap: 12px; }
.${ROOT_CLASS} .roprime-legacy-badges-row-extra { display: none; }
.${ROOT_CLASS}.is-expanded .roprime-legacy-badges-row-extra { display: grid; }
.${ROOT_CLASS} .css-izzd58-carouselItem { min-width: 0; }
.${ROOT_CLASS} .base-tile-thumbnail-wrapper .thumbnail-2d-container { display: grid; justify-content: center; }
.${ROOT_CLASS} .base-tile-thumbnail-wrapper img { width: 141px; height: 150px; }
`;
	document.head.appendChild(style);
}

function resolveBadgeImageUrl(imageUrl) {
	const url = String(imageUrl || "").trim();
	if (!url) return "";
	if (/^https?:\/\//i.test(url)) return url;
	return getExtensionResourceUrl(url.replace(/^\//, "")) || url;
}

function normalizeCustomBadges(entry) {
	if (Array.isArray(entry)) return entry;
	if (entry && typeof entry === "object") return [entry];
	return [];
}

function isValidBadgeEntry(badge) {
	return Boolean(
		badge?.title && badge?.label && badge?.alt && badge?.imageUrl,
	);
}

function buildBadgeTile(badge) {
	const imageSrc = resolveBadgeImageUrl(badge.imageUrl);
	return `<div class="css-izzd58-carouselItem">
		<div>
			<div class="base-tile">
				<a class="flex flex-col" href="${ROBLOX_BADGES_URL}#${badge.hash}" title="${badge.title}">
					<div class="base-tile-thumbnail-wrapper"><span class="thumbnail-2d-container base-tile-thumbnail radius-medium"><img class="" src="${imageSrc}" alt="${badge.alt}"></span></div>
					<div class="base-tile-title content-emphasis text-title-medium padding-top-medium">${badge.label}</div>
					<div class="base-tile-metadata content-default text-body-medium padding-top-xsmall"></div>
				</a>
			</div>
		</div>
	</div>`;
}

function buildBadgeRows(badges) {
	const rows = [];
	for (let i = 0; i < badges.length; i += BADGES_PER_ROW) {
		const extra = i >= BADGES_PER_ROW ? " roprime-legacy-badges-row-extra" : "";
		rows.push(
			`<div class="roprime-legacy-badges-row${extra}">${badges
				.slice(i, i + BADGES_PER_ROW)
				.map(buildBadgeTile)
				.join("")}</div>`,
		);
	}
	return rows.join("");
}

function buildBadgesHtml(badges) {
	const hasMore = badges.length > BADGES_PER_ROW;
	return BADGES_HTML.replace(
		"{$SEE_MORE_BUTTON}",
		hasMore ? SEE_MORE_BUTTON : "",
	).replace("{$BADGE_ROWS}", buildBadgeRows(badges));
}

function wireSeeMoreToggle(root) {
	const button = root.querySelector("[data-roprime-see-more]");
	if (!(button instanceof HTMLButtonElement)) return;

	button.addEventListener("click", () => {
		const expanded = root.classList.toggle("is-expanded");
		button.textContent = expanded ? "See Less" : "See More";
	});
}

async function fetchUserRobloxBadges(userId) {
	try {
		const response = await fetch(
			ROBLOX_BADGES_API.replace("{userId}", String(userId)),
			{ credentials: "include" },
		);
		if (!response.ok) return [];
		const data = await response.json();
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

function collectBadges(userId, apiBadges) {
	const badges = [];
	
	const custom = normalizeCustomBadges(
		CUSTOM_BADGES[userId] ?? CUSTOM_BADGES[String(userId)],
	);
	for (const badge of custom) {
		if (isValidBadgeEntry(badge)) badges.push(badge);
	}

	const badgeById = new Map(
		apiBadges
			.filter((badge) => Number.isFinite(Number(badge?.id)))
			.map((badge) => [Number(badge.id), badge]),
	);

	for (const id of BADGE_DISPLAY_ORDER) {
		if (badgeById.has(id)) badges.push(BADGE_DISPLAY[id]);
	}
	
	return badges;
}

function removeLegacyBadges() {
	for (const el of document.querySelectorAll(`.${ROOT_CLASS}`)) {
		el.remove();
	}
}

function insertBadges(tabContent, html) {
	tabContent.insertAdjacentHTML("afterbegin", html);
}

function stopProfileWatch() {
	if (watchTimer != null) {
		window.clearTimeout(watchTimer);
		watchTimer = null;
	}
	profileObserver?.disconnect();
	profileObserver = null;
}

function startProfileWatch() {
	const userId = parseUserIdFromUrl();
	if (profileObserver || !userId || findExistingBadges(userId)?.isConnected) {
		return;
	}

	profileObserver = new MutationObserver(() => {
		const currentUserId = parseUserIdFromUrl();
		if (!currentUserId || findExistingBadges(currentUserId)?.isConnected) {
			stopProfileWatch();
			return;
		}
		if (watchTimer != null) return;
		watchTimer = window.setTimeout(() => {
			watchTimer = null;
			void applyLegacyBadges();
		}, 250);
	});
	profileObserver.observe(document.body, { childList: true, subtree: true });
}

async function applyLegacyBadgesNow() {
	const userId = parseUserIdFromUrl();
	if (!userId) {
		stopProfileWatch();
		removeLegacyBadges();
		return false;
	}

	const existing = findExistingBadges(userId);
	if (existing instanceof HTMLElement && existing.isConnected) {
		stopProfileWatch();
		return true;
	}

	const tabContent = findTabContent();
	if (!tabContent) return false;

	removeLegacyBadges();

	const apiBadges = await fetchUserRobloxBadges(userId);
	if (parseUserIdFromUrl() !== userId) return false;

	const badges = collectBadges(userId, apiBadges);
	if (!badges.length) return false;

	if (findExistingBadges(userId)?.isConnected) {
		stopProfileWatch();
		return true;
	}

	const tabContentNow = findTabContent();
	if (!(tabContentNow instanceof HTMLElement)) return false;

	ensureStyles();
	insertBadges(tabContentNow, buildBadgesHtml(badges));

	const root = tabContentNow.querySelector(`.${ROOT_CLASS}`);
	if (!(root instanceof HTMLElement)) return false;

	root.dataset.roprimeUserId = String(userId);
	wireSeeMoreToggle(root);
	stopProfileWatch();
	return true;
}

function applyLegacyBadges() {
	if (applyPromise) return applyPromise;
	applyPromise = applyLegacyBadgesNow().finally(() => {
		applyPromise = null;
	});
	return applyPromise;
}

function onRouteChange() {
	stopProfileWatch();

	if (!parseUserIdFromUrl()) {
		removeLegacyBadges();
		return;
	}

	const userId = parseUserIdFromUrl();
	void applyLegacyBadges().then((applied) => {
		if (
			!applied &&
			userId === parseUserIdFromUrl() &&
			!findExistingBadges(userId)
		) {
			startProfileWatch();
		}
	});
}

if (!globalThis.__roprimeLegacyBadgesInstalled) {
	globalThis.__roprimeLegacyBadgesInstalled = true;
	window.addEventListener("roprime-location-change", onRouteChange);
	window.addEventListener("popstate", onRouteChange);
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", onRouteChange, {
			once: true,
		});
	} else {
		onRouteChange();
	}
}
