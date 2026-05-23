import { shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import {
	layerIsCurrent,
	mountProfileEffectLayer,
	profileUserMayShowEffect,
	resolveEquippedEffectId,
} from "./effectMount.js";
import { getProfileEffectById } from "./profileEffectsCatalog.js";
import {
	observeUserCardElements,
	onUserCardElement,
} from "./userCardElements.js";

const PICTURE_LAYER_ATTR = "data-roprime-friends-picture-effect";
const PROFILE_LAYER_ATTR = "data-roprime-friends-profile-effect";
const PICTURE_LAYER_CLASS = "roprime-friends-carousel-picture-effect";
const PROFILE_LAYER_CLASS = "roprime-friends-carousel-profile-effect";

let installed = false;
let syncQueue = Promise.resolve();

function parseUserIdFromCard(card) {
	const link =
		card.querySelector('a[href*="/users/"]') ||
		card.closest('a[href*="/users/"]');
	if (!(link instanceof HTMLAnchorElement)) return null;
	const href = link.getAttribute("href") || link.href || "";
	const match = href.match(/\/users\/(\d+)(?:\/|$)/i);
	if (!match) return null;
	const userId = Number(match[1]);
	return Number.isFinite(userId) && userId > 0 ? userId : null;
}

function findPictureHost(card) {
	return (
		card.querySelector(".avatar-card-image") ||
		card.querySelector(".thumbnail-2d-container.avatar-card-image") ||
		card.querySelector(".avatar.avatar-card-fullbody")
	);
}

function findProfileHost(card) {
	return (
		card.querySelector(".user-card.roprime-user-card") ||
		card.querySelector(".user-card") ||
		card.querySelector(".user-card-inner") ||
		card
	);
}

function layerIdFor(userId, kind) {
	return `roprime-friends-effect-${kind}-${userId}`;
}

function removeLayersInCard(card) {
	card
		.querySelectorAll(`[${PICTURE_LAYER_ATTR}], [${PROFILE_LAYER_ATTR}]`)
		.forEach((node) => {
			node.remove();
		});
}

async function syncCardKind(card, userId, kind) {
	const layerId = layerIdFor(userId, kind);
	const layerAttr =
		kind === "picture" ? PICTURE_LAYER_ATTR : PROFILE_LAYER_ATTR;
	const layerClass =
		kind === "picture" ? PICTURE_LAYER_CLASS : PROFILE_LAYER_CLASS;

	const existing = document.getElementById(layerId);
	if (existing) existing.remove();

	const effectId = await resolveEquippedEffectId(userId, kind);
	if (!effectId || !(await profileUserMayShowEffect(userId, effectId))) {
		return;
	}

	const effect = getProfileEffectById(effectId);
	if (!effect || effect.kind !== kind) return;

	const host =
		kind === "picture" ? findPictureHost(card) : findProfileHost(card);
	if (!(host instanceof HTMLElement)) return;

	if (layerIsCurrent(host, layerId, layerAttr, effect.id)) return;

	mountProfileEffectLayer(host, effect, {
		layerId,
		layerClass,
		layerAttr,
	});
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

	await syncCardKind(card, userId, "picture");
	await syncCardKind(card, userId, "profile");
}

function queueSyncCard(card) {
	syncQueue = syncQueue.then(() => syncCardEffects(card)).catch(() => {});
}

export function installFriendCarouselEffects() {
	if (installed) return;
	installed = true;

	observeUserCardElements();
	onUserCardElement((card) => {
		queueSyncCard(card);
	});
}

export function syncFriendCarouselEffects() {
	if (!installed) return;
	for (const card of document.querySelectorAll(".friends-carousel-tile")) {
		if (card instanceof HTMLElement) queueSyncCard(card);
	}
}
