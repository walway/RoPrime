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
const AVATAR_PROFILE_LINK_SELECTOR =
	'a.avatar-card-link[data-testid="avatar-card-link"]';
const AVATAR_CONTAINER_SELECTOR =
	'div.avatar.avatar-card-fullbody[data-testid="avatar-card-container"]';
const FRIEND_TILE_BUTTON_SELECTOR =
	'button.options-dropdown[type="button"]#friend-tile-button, button.options-dropdown[type="button"][id="friend-tile-button"]';
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
 * @returns {HTMLElement | null}
 */
function findPictureEffectHostFromLink(link) {
	const tile =
		link.closest(".friends-carousel-tile") ||
		link.closest(CAROUSEL_CONTAINER_SELECTOR);
	if (tile instanceof HTMLElement) {
		const btn = tile.querySelector(FRIEND_TILE_BUTTON_SELECTOR);
		if (btn instanceof HTMLButtonElement) return btn;
	}

	const avatar = link.closest(AVATAR_CONTAINER_SELECTOR);
	return avatar instanceof HTMLElement ? avatar : null;
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

	if (getComputedStyle(host).position === "static") {
		host.style.position = "relative";
	}

	host.appendChild(layer);
}

/**
 * @param {HTMLElement} card
 * @param {number} userId
 * @returns {HTMLAnchorElement | null}
 */
function findAvatarProfileLink(card, userId) {
	const carousel =
		card.closest(CAROUSEL_CONTAINER_SELECTOR) ||
		card.querySelector(CAROUSEL_CONTAINER_SELECTOR);
	const root =
		carousel instanceof HTMLElement
			? carousel
			: document.querySelector(CAROUSEL_CONTAINER_SELECTOR) || card;

	for (const link of root.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
		if (!(link instanceof HTMLAnchorElement)) continue;
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

	const tile = card.closest(".friends-carousel-tile") || card;
	if (tile instanceof HTMLElement) {
		const btn = tile.querySelector(FRIEND_TILE_BUTTON_SELECTOR);
		if (btn instanceof HTMLButtonElement) return btn;
	}

	return null;
}

function parseUserIdFromCard(card) {
	for (const link of card.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
		if (!(link instanceof HTMLAnchorElement)) continue;
		const userId = parseUserIdFromProfileLink(link);
		if (userId) return userId;
	}

	const link =
		card.querySelector('a[href*="/users/"]') ||
		card.closest('a[href*="/users/"]');
	if (!(link instanceof HTMLAnchorElement)) return null;
	return parseUserIdFromProfileLink(link);
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

	const userId = parseUserIdFromProfileLink(link);
	if (!userId) return;

	const host = findPictureEffectHostFromLink(link);
	if (!(host instanceof HTMLElement)) {
		removeLayerById(layerIdFor(userId));
		return;
	}

	await syncPictureEffectOnHost(host, userId);
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

function scanCarouselProfileLinks() {
	for (const container of document.querySelectorAll(
		CAROUSEL_CONTAINER_SELECTOR,
	)) {
		if (!(container instanceof HTMLElement)) continue;
		for (const link of container.querySelectorAll(AVATAR_PROFILE_LINK_SELECTOR)) {
			if (link instanceof HTMLAnchorElement) queueSyncAvatarLink(link);
		}
	}
}

function installCarouselLinkObserver() {
	if (!document.body) return;

	const observer = new MutationObserver(() => {
		scanCarouselProfileLinks();
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
	scanCarouselProfileLinks();
}

export function syncFriendCarouselEffects() {
	if (!installed) return;
	scanCarouselProfileLinks();
	for (const card of document.querySelectorAll(".friends-carousel-tile")) {
		if (card instanceof HTMLElement) queueSyncCard(card);
	}
}
