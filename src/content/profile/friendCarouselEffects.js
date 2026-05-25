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
const PICTURE_LAYER_CLASS = "roprime-friends-carousel-picture-effect";
const CAROUSEL_CONTAINER_SELECTOR = ".react-friends-carousel-container";
const AVATAR_PROFILE_LINK_SELECTOR = "a.avatar-card-link";
const AVATAR_CONTAINER_SELECTOR = "div.avatar.avatar-card-fullbody";
const LOTTIE_WRAP_CLASS = "roprime-profile-effect-lottie";

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
 * Profile link below → parent avatar host above (div.avatar.avatar-card-fullbody).
 *
 * @param {HTMLAnchorElement} link
 * @returns {HTMLElement | null}
 */
function findPictureEffectHostFromLink(link) {
	if (!isAvatarProfileLink(link)) return null;

	const avatar = link.closest(AVATAR_CONTAINER_SELECTOR);
	if (!(avatar instanceof HTMLElement)) return null;

	if (!avatar.querySelector(AVATAR_PROFILE_LINK_SELECTOR)) return null;

	return avatar;
}

/**
 * @param {HTMLElement} avatarHost
 * @param {HTMLAnchorElement} link
 * @returns {{ avatar: HTMLElement, link: HTMLAnchorElement } | null}
 */
function resolveAvatarHostAndLink(avatarHost, link) {
	if (!isAvatarProfileLink(link)) return null;
	const avatar = link.closest(AVATAR_CONTAINER_SELECTOR);
	if (!(avatar instanceof HTMLElement) || avatar !== avatarHost) return null;
	return { avatar, link };
}

/**
 * @param {import("./profileEffectsCatalog.js").ProfileEffect} effect
 * @param {{ layerId: string, layerAttr: string }} options
 * @param {HTMLElement} host
 */
function mountFriendCarouselPictureEffect(host, effect, { layerId, layerAttr }) {
	const layer = document.createElement("div");
	layer.id = layerId;
	layer.setAttribute(layerAttr, effect.id);
	layer.className = PICTURE_LAYER_CLASS;

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
	const scope =
		root.closest(CAROUSEL_CONTAINER_SELECTOR) ||
		root.querySelector(CAROUSEL_CONTAINER_SELECTOR) ||
		root;

	for (const link of scope.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
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
	if (!(link instanceof HTMLAnchorElement)) return null;
	return findPictureEffectHostFromLink(link);
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

function layerIdFor(userId) {
	return `roprime-friends-effect-picture-${userId}`;
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
 */
async function syncPictureEffectOnHost(host, userId) {
	const layerId = layerIdFor(userId);
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
	mountFriendCarouselPictureEffect(host, effect, {
		layerId,
		layerAttr: PICTURE_LAYER_ATTR,
	});
}

async function syncAvatarProfileLink(link) {
	if (!shouldRunRoPrimeOnCurrentPage()) {
		removeLayersInCard(link);
		return;
	}

	if (!isAvatarProfileLink(link)) return;

	const userId = parseUserIdFromProfileLink(link);
	if (!userId) return;

	const host = findPictureEffectHostFromLink(link);
	if (!(host instanceof HTMLElement)) {
		removeLayerById(layerIdFor(userId));
		return;
	}

	await syncPictureEffectOnHost(host, userId);
}

async function syncAvatarHost(avatarHost) {
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

	const resolved = resolveAvatarHostAndLink(avatarHost, link);
	if (!resolved) return;

	await syncPictureEffectOnHost(resolved.avatar, userId);
}

async function syncCardEffects(card) {
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
		removeLayerById(layerIdFor(userId));
		return;
	}

	await syncPictureEffectOnHost(host, userId);
}

function queueSyncCard(card) {
	syncQueue = syncQueue.then(() => syncCardEffects(card)).catch(() => {});
}

function queueSyncAvatarLink(link) {
	syncQueue = syncQueue
		.then(() => syncAvatarProfileLink(link))
		.catch(() => {});
}

function queueSyncAvatarHost(avatarHost) {
	syncQueue = syncQueue.then(() => syncAvatarHost(avatarHost)).catch(() => {});
}

function scanCarouselAvatars() {
	for (const container of document.querySelectorAll(
		CAROUSEL_CONTAINER_SELECTOR,
	)) {
		if (!(container instanceof HTMLElement)) continue;

		for (const link of container.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
			if (link instanceof HTMLAnchorElement) queueSyncAvatarLink(link);
		}

		for (const avatar of container.querySelectorAll(AVATAR_CONTAINER_SELECTOR)) {
			if (avatar instanceof HTMLElement) queueSyncAvatarHost(avatar);
		}
	}
}

function installCarouselLinkObserver() {
	if (!document.body) return;

	const observer = new MutationObserver(() => {
		scanCarouselAvatars();
	});
	observer.observe(document.body, { childList: true, subtree: true });
}

export function installFriendCarouselEffects() {
	if (installed) return;
	installed = true;

	observeUserCardElements();
	onUserCardElement((card) => {
		queueSyncCard(card);
	});

	installCarouselLinkObserver();
	scanCarouselAvatars();
}

export function syncFriendCarouselEffects() {
	if (!installed) return;
	scanCarouselAvatars();
	for (const card of document.querySelectorAll(".friends-carousel-tile")) {
		if (card instanceof HTMLElement) queueSyncCard(card);
	}
}
