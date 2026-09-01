import { parseUserProfileIdFromLocation } from "../core/core.js";

const AVATAR_DETAILS_URL = "https://avatar.roblox.com/v2/avatar/users";
const THUMBNAILS_URL = "https://thumbnails.roblox.com/v1/assets";
const RP_WEARING_ATTR = "data-roprime-wearing-cards";
const RP_WEARING_LAYOUT_ATTR = "data-roprime-profile-tab-layout";

let syncPromise = null;
let lastUserId = 0;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

async function fetchWearingAssets(userId) {
  const response = await fetch(`${AVATAR_DETAILS_URL}/${userId}/avatar`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.assets) ? data.assets : [];
}

async function fetchAssetThumbnails(assetIds) {
  if (!assetIds.length) return new Map();
  const params = new URLSearchParams({
    assetIds: assetIds.join(","),
    size: "150x150",
    format: "Png",
    isCircular: "false",
  });
  const response = await fetch(`${THUMBNAILS_URL}?${params.toString()}`, {
    credentials: "include",
  });
  if (!response.ok) return new Map();
  const data = await response.json();
  const map = new Map();
  for (const entry of data?.data || []) {
    if (entry?.targetId && entry?.imageUrl) {
      map.set(Number(entry.targetId), entry.imageUrl);
    }
  }
  return map;
}

function ensureWearingLayout(tabContent) {
  let layout = tabContent.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`);
  if (layout instanceof HTMLElement) return layout;

  const preview = tabContent.querySelector("[data-roprime-avatar-preview]");
  const wearing = tabContent.querySelector(`[${RP_WEARING_ATTR}]`);
  layout = el("div", "roprime-profile-tab-layout");
  layout.setAttribute(RP_WEARING_LAYOUT_ATTR, "1");
  if (preview) layout.appendChild(preview);
  if (wearing) layout.appendChild(wearing);
  tabContent.prepend(layout);
  return layout;
}

function ensureWearingHost(tabContent) {
  ensureWearingLayout(tabContent);
  let host = tabContent.querySelector(`[${RP_WEARING_ATTR}]`);
  if (host instanceof HTMLElement) return host;
  host = el("div", "roprime-profile-wearing-cards");
  host.setAttribute(RP_WEARING_ATTR, "1");
  const layout = tabContent.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`);
  if (layout) layout.appendChild(host);
  else tabContent.appendChild(host);
  return host;
}

function buildWearingCard(asset, imageUrl) {
  const card = el("a", "roprime-profile-wearing-card");
  card.href = `https://www.roblox.com/catalog/${asset.id}`;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const thumb = el("div", "roprime-profile-wearing-thumb");
  if (imageUrl) {
    const img = el("img");
    img.src = imageUrl;
    img.alt = asset.name || "Avatar item";
    img.loading = "lazy";
    thumb.appendChild(img);
  }

  const meta = el("div", "roprime-profile-wearing-meta");
  const name = el("span", "roprime-profile-wearing-name");
  name.textContent = asset.name || `Item ${asset.id}`;
  const type = el("span", "roprime-profile-wearing-type");
  type.textContent = asset.assetType?.name || "Accessory";
  meta.append(name, type);
  card.append(thumb, meta);
  return card;
}

function renderWearingCards(host, assets, thumbnails) {
  host.textContent = "";
  const title = el("h3", "roprime-profile-wearing-title");
  title.textContent = "Currently Wearing";
  host.appendChild(title);

  const grid = el("div", "roprime-profile-wearing-grid");
  for (const asset of assets) {
    if (!asset?.id) continue;
    grid.appendChild(
      buildWearingCard(asset, thumbnails.get(Number(asset.id)) || ""),
    );
  }
  host.appendChild(grid);
}

export async function syncProfileWearingCards(tabContent) {
  if (!(tabContent instanceof HTMLElement)) return;
  const userId = parseUserProfileIdFromLocation();
  if (!userId) return;

  const host = ensureWearingHost(tabContent);
  if (lastUserId === userId && host.childElementCount > 0) return;

  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      const assets = await fetchWearingAssets(userId);
      const assetIds = assets.map((asset) => Number(asset.id)).filter(Boolean);
      const thumbnails = await fetchAssetThumbnails(assetIds);
      renderWearingCards(host, assets, thumbnails);
      lastUserId = userId;
    } catch (error) {
      console.warn("Profile wearing cards failed", error);
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
}

export function removeProfileWearingCards() {
  lastUserId = 0;
  document.querySelector(`[${RP_WEARING_ATTR}]`)?.remove();
  document.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`)?.remove();
}
