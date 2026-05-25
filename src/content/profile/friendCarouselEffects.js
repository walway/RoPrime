import { shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import {
	layerIsCurrent,
	profileUserMayShowEffect,
	resolveEquippedEffectId,
} from "./effectMount.js";
import {
	applyProfileEffectIframeTransparentAttrs,
	getProfileEffectById,
	getProfileEffectShopEmbedSrc,
} from "./profileEffectsCatalog.js";
import {
	observeUserCardElements,
	onUserCardElement,
} from "./userCardElements.js";

const PICTURE_LAYER_ATTR = "data-roprime-friends-picture-effect";
const CAROUSEL_LAYER_CLASS = "roprime-friends-carousel-picture-effect";
const FRIENDS_LIST_LAYER_CLASS = "roprime-friends-list-picture-effect";
const CAROUSEL_CONTAINER_SELECTOR = ".react-friends-carousel-container";
const AVATAR_PROFILE_LINK_SELECTOR = "a.avatar-card-link";
const AVATAR_CONTAINER_SELECTOR = "div.avatar.avatar-card-fullbody";
const LOTTIE_WRAP_CLASS = "roprime-profile-effect-lottie";

/** @typedef {"carousel" | "friends-list"} AvatarEffectContext */

let installed = false;
let syncQueue = Promise.resolve();

/**
 * @param {HTMLAnchorElement} link
 * @returns {number | null}
 */
export function parseUserIdFromProfileLink(link) {
	try {
		const url = new URL(link.href, "https://www.roblox.com");
		const match = url.pathname.match(/\/users\/(\d+)\/profile\/?$/i);
		if (!match) return null;
		const userId = Number(match[1]);
		return Number.isFinite(userId) && userId > 0 ? userId : null;
	} catch {
		const href = (link.getAttribute("href") || "").trim();
		const match = href.match(/\/users\/(\d+)\/profile\/?$/i);
		if (!match) return null;
		const userId = Number(match[1]);
		return Number.isFinite(userId) && userId > 0 ? userId : null;
	}
}

/**
 * @param {HTMLAnchorElement} link
 */
function isAvatarProfileLink(link) {
	return (
		link instanceof HTMLAnchorElement &&
		link.classList.contains("avatar-card-link") &&
		parseUserIdFromProfileLink(link) != null
	);
}

/**
 * @param {HTMLElement} card
 * @returns {AvatarEffectContext | null}
 */
function getCardContext(card) {
	if (
		card.matches(".friends-carousel-tile") ||
		card.closest(CAROUSEL_CONTAINER_SELECTOR)
	) {
		return "carousel";
	}

	if (
		card.matches("li.list-item.avatar-card") ||
		card.closest("li.list-item.avatar-card") ||
		card.matches(".avatar-card-container") ||
		card.matches(".user-item-clickable") ||
		card.closest(".user-item-clickable")
	) {
		return "friends-list";
	}

	return null;
}

/**
 * @param {AvatarEffectContext} context
 */
function layerClassForContext(context) {
	return context === "friends-list"
		? FRIENDS_LIST_LAYER_CLASS
		: CAROUSEL_LAYER_CLASS;
}

/**
 * @param {number} userId
 * @param {AvatarEffectContext} context
 */
function layerIdFor(userId, context) {
	return context === "friends-list"
		? `roprime-friends-list-picture-${userId}`
		: `roprime-friends-carousel-picture-${userId}`;
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement | null}
 */
function findAvatarContainerInRoot(root) {
	const avatar = root.querySelector(AVATAR_CONTAINER_SELECTOR);
	return avatar instanceof HTMLElement ? avatar : null;
}

/**
 * Profile link and avatar are often siblings on the friends list (link not nested
 * inside div.avatar.avatar-card-fullbody). Mount on the avatar in the same card.
 *
 * @param {HTMLAnchorElement} link
 * @returns {HTMLElement | null}
 */
function findPictureEffectHostFromLink(link) {
	if (!isAvatarProfileLink(link)) return null;

	const avatarInLink = link.closest(AVATAR_CONTAINER_SELECTOR);
	if (avatarInLink instanceof HTMLElement) return avatarInLink;

	const parent = link.parentElement;
	if (parent instanceof HTMLElement) {
		const siblingAvatar = findAvatarContainerInRoot(parent);
		if (siblingAvatar) return siblingAvatar;
	}

	const card = link.closest(
		"li.list-item.avatar-card, .avatar-card-container, .user-item-clickable, .friends-carousel-tile",
	);
	if (card instanceof HTMLElement) {
		const cardAvatar = findAvatarContainerInRoot(card);
		if (cardAvatar) return cardAvatar;
	}

	return null;
}

/**
 * @param {import("./profileEffectsCatalog.js").ProfileEffect} effect
 * @param {{ layerId: string, layerAttr: string, layerClass: string }} options
 * @param {HTMLElement} host
 */
function mountFriendPictureEffect(host, effect, { layerId, layerAttr, layerClass }) {
	const layer = document.createElement("div");
	layer.id = layerId;
	layer.setAttribute(layerAttr, effect.id);
	layer.className = layerClass;

	const lottie = document.createElement("div");
	lottie.className = LOTTIE_WRAP_CLASS;

	const iframe = document.createElement("iframe");
	iframe.src = getProfileEffectShopEmbedSrc(effect);
	iframe.title = effect.titleKey;
	iframe.loading = "lazy";
	iframe.setAttribute("tabindex", "-1");
	applyProfileEffectIframeTransparentAttrs(iframe);

	lottie.appendChild(iframe);
	layer.appendChild(lottie);
	host.appendChild(layer);
}

/**
 * @param {HTMLElement} root
 * @param {number} userId
 * @returns {HTMLAnchorElement | null}
 */
function findAvatarProfileLink(root, userId) {
	for (const link of root.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
		if (!(link instanceof HTMLAnchorElement)) continue;
		if (!isAvatarProfileLink(link)) continue;
		if (parseUserIdFromProfileLink(link) === userId) return link;
	}

	return null;
}

/**
 * @param {HTMLElement} card
 * @param {number} userId
 * @returns {HTMLElement | null}
 */
function findPictureEffectHost(card, userId) {
	const link = findAvatarProfileLink(card, userId);
	if (link instanceof HTMLAnchorElement) {
		const fromLink = findPictureEffectHostFromLink(link);
		if (fromLink) return fromLink;
	}

	return findAvatarContainerInRoot(card);
}

function parseUserIdFromCard(card) {
	for (const link of card.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
		if (!(link instanceof HTMLAnchorElement)) continue;
		if (!isAvatarProfileLink(link)) continue;
		const userId = parseUserIdFromProfileLink(link);
		if (userId) return userId;
	}
	return null;
}

function removeLayerById(layerId) {
	document.getElementById(layerId)?.remove();
}

function removeLayersInCard(card) {
	card.querySelectorAll(`[${PICTURE_LAYER_ATTR}]`).forEach((node) => {
		node.remove();
	});
}

/**
 * @param {HTMLElement} host
 * @param {number} userId
 * @param {AvatarEffectContext} context
 */
async function syncPictureEffectOnHost(host, userId, context) {
	const layerId = layerIdFor(userId, context);
	const kind = "picture";

	const effectId = await resolveEquippedEffectId(userId, kind);
	if (!effectId || !(await profileUserMayShowEffect(userId, effectId))) {
		removeLayerById(layerId);
		return;
	}

	const effect = getProfileEffectById(effectId);
	if (!effect || effect.kind !== kind) {
		removeLayerById(layerId);
		return;
	}

	if (layerIsCurrent(host, layerId, PICTURE_LAYER_ATTR, effect.id)) return;

	removeLayerById(layerId);
	mountFriendPictureEffect(host, effect, {
		layerId,
		layerAttr: PICTURE_LAYER_ATTR,
		layerClass: layerClassForContext(context),
	});
}

async function syncAvatarProfileLink(link, context) {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeLayersInCard(link);
		return;
	}

	if (!isAvatarProfileLink(link)) return;

	const userId = parseUserIdFromProfileLink(link);
	if (!userId) return;

	const host = findPictureEffectHostFromLink(link);
	if (!(host instanceof HTMLElement)) {
		removeLayerById(layerIdFor(userId, context));
		return;
	}

	await syncPictureEffectOnHost(host, userId, context);
}

async function syncAvatarHost(avatarHost, context) {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeLayersInCard(avatarHost);
		return;
	}

	const link = avatarHost.querySelector(AVATAR_PROFILE_LINK_SELECTOR);
	if (!(link instanceof HTMLAnchorElement) || !isAvatarProfileLink(link)) {
		return;
	}

	const userId = parseUserIdFromProfileLink(link);
	if (!userId) return;

	const avatar = link.closest(AVATAR_CONTAINER_SELECTOR);
	if (!(avatar instanceof HTMLElement) || avatar !== avatarHost) return;

	await syncPictureEffectOnHost(avatar, userId, context);
}

async function syncCardEffects(card, context) {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeLayersInCard(card);
		return;
	}

	const userId = parseUserIdFromCard(card);
	if (!userId) {
		removeLayersInCard(card);
		return;
	}

	const host = findPictureEffectHost(card, userId);
	if (!(host instanceof HTMLElement)) {
		removeLayerById(layerIdFor(userId, context));
		return;
	}

	await syncPictureEffectOnHost(host, userId, context);
}

function queueSyncCard(card, context) {
	syncQueue = syncQueue
		.then(() => syncCardEffects(card, context))
		.catch(() => {});
}

function queueSyncAvatarLink(link, context) {
	syncQueue = syncQueue
		.then(() => syncAvatarProfileLink(link, context))
		.catch(() => {});
}

function queueSyncAvatarHost(avatarHost, context) {
	syncQueue = syncQueue
		.then(() => syncAvatarHost(avatarHost, context))
		.catch(() => {});
}

function scanCarouselAvatars() {
	for (const container of document.querySelectorAll(
		CAROUSEL_CONTAINER_SELECTOR,
	)) {
		if (!(container instanceof HTMLElement)) continue;

		for (const link of container.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
			if (link instanceof HTMLAnchorElement) {
				queueSyncAvatarLink(link, "carousel");
			}
		}

		for (const avatar of container.querySelectorAll(AVATAR_CONTAINER_SELECTOR)) {
			if (avatar instanceof HTMLElement) queueSyncAvatarHost(avatar, "carousel");
		}
	}
}

function scanFriendsListAvatars() {
	for (const item of document.querySelectorAll("li.list-item.avatar-card")) {
		if (!(item instanceof HTMLElement)) continue;
		if (item.closest(CAROUSEL_CONTAINER_SELECTOR)) continue;
		queueSyncCard(item, "friends-list");
	}

	for (const container of document.querySelectorAll(".avatar-card-container")) {
		if (!(container instanceof HTMLElement)) continue;
		if (container.closest(CAROUSEL_CONTAINER_SELECTOR)) continue;
		queueSyncCard(container, "friends-list");
	}

	for (const item of document.querySelectorAll(".user-item-clickable")) {
		if (!(item instanceof HTMLElement)) continue;
		if (item.closest(CAROUSEL_CONTAINER_SELECTOR)) continue;
		queueSyncCard(item, "friends-list");
	}
}

function installCarouselLinkObserver() {
	if (!document.body) return;

	const observer = new MutationObserver(() => {
		scanCarouselAvatars();
		scanFriendsListAvatars();
	});
	observer.observe(document.body, { childList: true, subtree: true });
}

export function installFriendCarouselEffects() {
	if (installed) return;
	installed = true;

	observeUserCardElements();
	onUserCardElement((card) => {
		const context = getCardContext(card);
		if (context) queueSyncCard(card, context);
	});

	installCarouselLinkObserver();
	scanCarouselAvatars();
	scanFriendsListAvatars();
}

export function syncFriendCarouselEffects() {
	if (!installed) return;
	scanCarouselAvatars();
	scanFriendsListAvatars();

	for (const card of document.querySelectorAll(".friends-carousel-tile")) {
		if (card instanceof HTMLElement) queueSyncCard(card, "carousel");
	}

	for (const item of document.querySelectorAll("li.list-item.avatar-card")) {
		if (!(item instanceof HTMLElement)) continue;
		if (item.closest(CAROUSEL_CONTAINER_SELECTOR)) continue;
		queueSyncCard(item, "friends-list");
	}

	for (const item of document.querySelectorAll(".user-item-clickable")) {
		if (!(item instanceof HTMLElement)) continue;
		if (item.closest(CAROUSEL_CONTAINER_SELECTOR)) continue;
		queueSyncCard(item, "friends-list");
	}
}
