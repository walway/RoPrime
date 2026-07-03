// this is my custom backup for the roblox.com/info/roblox-badges if roblox deletes it
//
// selected badge uses background-color: #494d5a;
//
// import { getExtensionResourceUrl } from "../../core/core.js";
//
//  const BADGE_IDS = {
//	welcome_club: 18,
//	admin: 1,
//	veteran: 12,
//	friendship: 2,
//	ambassador: 14,
//	inviter: 8,
//	homestead: 6,
//	bricksmith: 7,
//	model_maker: 17,
//	combat: 3,
//	warrior: 4,
//	bloxxer: 5,
//};
//
//const BADGES_PAGE_BACKUP = [
//	{
//		title: "Membership Badges",
//		badges: [
//			{
//				id: 18,
//				hash: "Badge18",
//				title: "Welcome To The Club Badge",
//				description:
//					"This badge was awarded to users who had ever belonged to the illustrious Builders Club, which ran from 2007 to 2019. These people are part of a long tradition of Roblox greatness. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/welcome-to-the-club.svg",
//			},
//		],
//	},
//	{
//		title: "Group Badges",
//		badges: [
//			{
//				id: 1,
//				hash: "Badge1",
//				title: "Administrator Badge",
//				description:
//					"This badge identifies an account as belonging to a Roblox administrator. Only official Roblox administrators will possess this badge. If someone claims to be an admin, but does not have this badge, they are potentially trying to mislead you. If this happens, please report abuse and we will delete the imposter's account.",
//				usesAdminIcon: true,
//			},
//			{
//				id: 12,
//				hash: "Badge12",
//				title: "Veteran Badge",
//				description:
//					"This badge recognized members who had visited Roblox for one year or more. They are stalwart group members who have stuck with us over countless releases, and have helped shape Roblox into the experience that it is today. These medalists are the true steel, the core of the Robloxian history ... and its future. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/veteran.svg",
//			},
//			{
//				id: 2,
//				hash: "Badge2",
//				title: "Friendship Badge",
//				description:
//					"This badge was given to members who embraced the Roblox group and made at least 20 friends. People who have this badge are good people to know and can probably help you out if you are having trouble. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/friendship.svg",
//			},
//			{
//				id: 14,
//				hash: "Badge14",
//				title: "Ambassador Badge",
//				description:
//					"This badge was awarded during the Ambassador Program, which ran from 2009 to 2012. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/ambassador.svg",
//			},
//			{
//				id: 8,
//				hash: "Badge8",
//				title: "Inviter Badge",
//				description:
//					"This badge was awarded during the Inviter Program, which ran from 2009 to 2013. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/inviter.svg",
//			},
//		],
//	},
//	{
//		title: "Developer Badges",
//		badges: [
//			{
//				id: 6,
//				hash: "Badge6",
//				title: "Homestead Badge",
//				description:
//					"This badge was earned by having your personal place visited 100 times. People who achieved this have demonstrated their ability to build cool things that other Robloxians were interested enough in to check out. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/homestead.svg",
//			},
//			{
//				id: 7,
//				hash: "Badge7",
//				title: "Bricksmith Badge",
//				description:
//					"This badge was earned by having a popular personal place. Once your place had been visited 1000 times, you received this award. Robloxians with Bricksmith badges are accomplished builders who were able to create a place that people wanted to explore a thousand times. They no doubt know a thing or two about putting bricks together. This badge could be earned from 2007 to 2026. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/bricksmith.svg",
//			},
//			{
//				id: 17,
//				hash: "Badge17",
//				title: "Official Model Maker Badge",
//				description:
//					"This badge was awarded to members whose creations are so awesome, Roblox endorsed them. Owners of this badge probably have great scripting and building skills. It has been retired and is no longer attainable.",
//				imageUrl: "resources/badges/official-model-maker.svg",
//			},
//		],
//	},
//	{
//		title: "Gamer Badges",
//		badges: [
//			{
//				id: 3,
//				hash: "Badge3",
//				title: "Combat Initiation Badge",
//				description:
//					"This badge was granted when a user scored 10 victories in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.",
//				imageUrl: "resources/badges/combat.svg",
//			},
//			{
//				id: 4,
//				hash: "Badge4",
//				title: "Warrior Badge",
//				description:
//					"This badge was granted when a user scored 100 or more victories in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.",
//				imageUrl: "resources/badges/warrior.svg",
//			},
//			{
//				id: 5,
//				hash: "Badge5",
//				title: "Bloxxer Badge",
//				description:
//					"This badge was granted when a user scored at least 250 victories, and fewer than 250 wipeouts, in experiences that use classic combat scripts. It was retired Summer 2015 and is no longer attainable.",
//				imageUrl: "resources/badges/bloxxer.svg",
//			},
//		],
//	},
//];
//
//function robloxBadgesUrlMatches(loc = window.location) {
//	return /\/info\/roblox-badges(?:\/|$|[?#])/i.test(loc.pathname || "");
//}
//
//function resolveImageUrl(imageUrl) {
//	const url = String(imageUrl || "").trim();
//	if (!url) return "";
//	if (/^https?:\/\//i.test(url)) return url;
//	return getExtensionResourceUrl(url.replace(/^\//, "")) || url;
//}
//
//function replaceWithImage(badge) {
//	if (badge.usesAdminIcon) {
//		return `<span class="icon-administrator" title="Administrator"></span>`;
//	}
//	const src = resolveImageUrl(badge.imageUrl);
//	const alt = badge.title.replace(/ Badge$/, "");
//	return `<img src="${src}" alt="${alt}" width="75" height="75">`;
//}
//
//function injectBadgesWithInfo(badge) {
//	return `<li id="Badge${badge.id}" class="divider-bottom stack-row">
// <div class="badge-image">
// 	${replaceWithImage(badge)}
// </div>
// <div class="badge-description">
// 	<h3>${badge.title}</h3>
// 	<p>${badge.description}</p>
// </div>
// <div style="clear: both"></div>
//</li>`;
//}
//
//function injectBadgesPageBackup() {
//	return BADGES_PAGE_BACKUP.map(
//		(section) => `<div class="stack">
//	<h2>${section.title}</h2>
//	<ul class="stack-list">
//		${section.badges.map(injectBadgesWithInfo).join("")}
//	</ul>
//</div>`,
// 	).join("");
// }
//
// function injectBadgesInfoBackupPage() {
// 	return `<div id="badge-container" class="text badge-container">
// 	<h1>Badges</h1>
// 	${injectBadgesPageBackup()}
// </div>`;
// }
//
// function scrollToBadge() {
// 	const hash = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
// 	if (!hash) return;
// 	const badgeId = BADGE_IDS[hash.toLowerCase()];
// 	if (!badgeId) return;
// 	const target = document.getElementById(`Badge${badgeId}`);
// 	target?.scrollIntoView({ behavior: "smooth", block: "smooth" });
// }
//
// function displayRobloxBadgesInfoPage() {
// 	if (!robloxBadgesUrlMatches()) return;

// 	const content = document.querySelector("div.content");
// 	if (!(content instanceof HTMLElement)) return;

// 	content.innerHTML = injectBadgesInfoBackupPage();
// 	scrollToBadge();
// }
//
// function onRouteChange() {
// 	displayRobloxBadgesInfoPage();
// }
//
// if (!globalThis.isRobloxBadgesInfoPageInjected) {
// 	globalThis.isRobloxBadgesInfoPageInjected = true;
// 	window.addEventListener("roprime-location-change", onRouteChange);
// 	window.addEventListener("popstate", onRouteChange);
// 	window.addEventListener("hashchange", scrollToBadge);
// 	if (document.readyState === "loading") {
// 		document.addEventListener("DOMContentLoaded", onRouteChange, {
// 			once: true,
// 		});
// 	} else {
// 		onRouteChange();
// 	}
// }
