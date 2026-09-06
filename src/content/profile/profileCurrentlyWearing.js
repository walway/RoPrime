import { parseUserProfileIdFromLocation } from "../core/core.js";
import {
  ensureRobloxTranslations,
  robloxT,
} from "../core/translations.js";
import { appendParsedMarkup } from "../ui/dom.js";

const AVATAR_DETAILS_URL = "https://avatar.roblox.com/v2/avatar/users";
const THUMBNAILS_URL = "https://thumbnails.roblox.com/v1/assets";
const CATALOG_DETAILS_URL = "https://catalog.roblox.com/v1/catalog/items/details";

const RP_WEARING_ATTR = "data-roprime-wearing-cards";
const RP_WEARING_LAYOUT_ATTR = "data-roprime-profile-tab-layout";
const RP_PAGE_ATTR = "data-roprime-wearing-page";

const PAGE_SIZE = 6;
const SHIMMER_PLACEHOLDER_COUNT = 6;


const VERIFIED_BADGE_MARKUP =
  '<img src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 28 28\' fill=\'none\'%3E%3Cg clip-path=\'url(%23clip0_8_46)\'%3E%3Crect x=\'5.88818\' width=\'22.89\' height=\'22.89\' transform=\'rotate(15 5.88818 0)\' fill=\'%230066FF\'/%3E%3Cpath fill-rule=\'evenodd\' clip-rule=\'evenodd\' d=\'M20.543 8.7508L20.549 8.7568C21.15 9.3578 21.15 10.3318 20.549 10.9328L11.817 19.6648L7.45 15.2968C6.85 14.6958 6.85 13.7218 7.45 13.1218L7.457 13.1148C8.058 12.5138 9.031 12.5138 9.633 13.1148L11.817 15.2998L18.367 8.7508C18.968 8.1498 19.942 8.1498 20.543 8.7508Z\' fill=\'white\'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id=\'clip0_8_46\'%3E%3Crect width=\'28\' height=\'28\' fill=\'white\'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E" title="Verified Badge" alt="Verified Badge" class="verified-badge-container verified-badge-icon-catalog-item-rendered">';

let syncPromise = null;
let lastUserId = 0;
/** @type {{ assets: any[], thumbnails: Map<number, string>, details: Map<number, any> } | null} */
let cachedPayload = null;
let currentPage = 1;

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function getCsrfToken() {
  const meta =
    document.querySelector('meta[name="csrf-token"]') ||
    document.querySelector('meta[name="data-token"]');
  return meta?.getAttribute("content") || "";
}

function catalogSlug(name) {
  const slug = String(name || "item")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

function creatorTypeOf(detail) {
  return String(detail?.creatorType || "").toLowerCase();
}

function isCommunityCreator(detail) {
  const type = creatorTypeOf(detail);
  return type === "group" || type === "community";
}

function isRobloxCreator(detail) {
  const id = Number(detail?.creatorTargetId);
  const name = String(detail?.creatorName || "").trim().toLowerCase();
  return id === 1 || name === "roblox";
}

function creatorProfileUrl(detail) {
  const id = Number(detail?.creatorTargetId);
  if (!Number.isFinite(id) || id <= 0) return "/users/1/profile";
  if (isCommunityCreator(detail)) {
    return `/communities/${id}`;
  }
  return `/users/${id}/profile`;
}

function creatorDisplayName(detail) {
  const name = String(detail?.creatorName || "Roblox").trim() || "Roblox";
  if (isRobloxCreator(detail) || isCommunityCreator(detail)) return name;
  return name.startsWith("@") ? name : `@${name}`;
}

function itemPriceValue(detail) {
  if (typeof detail?.price === "number") return detail.price;
  if (typeof detail?.lowestPrice === "number") return detail.lowestPrice;
  return null;
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
  const map = new Map();
  for (let i = 0; i < assetIds.length; i += 100) {
    const chunk = assetIds.slice(i, i + 100);
    const params = new URLSearchParams({
      assetIds: chunk.join(","),
      size: "150x150",
      format: "Png",
      isCircular: "false",
    });
    const response = await fetch(`${THUMBNAILS_URL}?${params.toString()}`, {
      credentials: "include",
    });
    if (!response.ok) continue;
    const data = await response.json();
    for (const entry of data?.data || []) {
      if (entry?.targetId && entry?.imageUrl) {
        map.set(Number(entry.targetId), entry.imageUrl);
      }
    }
  }
  return map;
}

async function fetchCatalogDetails(assetIds) {
  const map = new Map();
  if (!assetIds.length) return map;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-TOKEN"] = csrf;

  for (let i = 0; i < assetIds.length; i += 30) {
    const chunk = assetIds.slice(i, i + 30);
    try {
      const response = await fetch(CATALOG_DETAILS_URL, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          items: chunk.map((id) => ({ itemType: "Asset", id })),
        }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      for (const entry of data?.data || []) {
        if (entry?.id) map.set(Number(entry.id), entry);
      }
    } catch {
    }
  }
  return map;
}

function ensureWearingHost(layout) {
  let parent = layout;
  if (!(parent instanceof HTMLElement)) {
    parent = document.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`);
  }
  if (!(parent instanceof HTMLElement)) return null;

  let host = parent.querySelector(`[${RP_WEARING_ATTR}]`);
  if (host instanceof HTMLElement) return host;
  host = el("div", "roprime-profile-wearing-cards");
  host.setAttribute(RP_WEARING_ATTR, "1");
  parent.appendChild(host);
  return host;
}

function buildShimmerPlaceholderCard() {
  const li = el("li", "list-item item-card");
  const container = el("div", "item-card-container");
  const thumbWrap = el("div", "item-card-thumb-container");
  const thumb2d = el("thumbnail-2d", "item-card-thumb");
  const span = el("span", "thumbnail-2d-container shimmer");
  thumb2d.appendChild(span);
  thumbWrap.appendChild(thumb2d);
  container.appendChild(thumbWrap);
  li.appendChild(container);
  return li;
}

function renderShimmerPlaceholders(host) {
  host.textContent = "";
  const list = el("ul", "hlist item-cards-stackable roprime-wearing-item-list");
  for (let i = 0; i < SHIMMER_PLACEHOLDER_COUNT; i += 1) {
    list.appendChild(buildShimmerPlaceholderCard());
  }
  host.appendChild(list);
}

function attachThumbImage(span, imageUrl, name) {
  span.classList.add("shimmer");
  if (!imageUrl) {
    span.classList.remove("shimmer");
    return;
  }

  const img = el("img");
  img.alt = name;
  img.title = name;
  img.loading = "lazy";

  const clearShimmer = () => {
    span.classList.remove("shimmer");
  };
  img.addEventListener("load", clearShimmer, { once: true });
  img.addEventListener("error", clearShimmer, { once: true });
  img.src = imageUrl;
  if (img.complete) clearShimmer();
  span.appendChild(img);
}

function buildCreatorRow(detail) {
  const creator = el("div", "text-overflow item-card-creator");
  const wrap = el("span", "text-overflow");
  const byLabel = robloxT("Feature.Avatar.Label.By", "By");
  wrap.appendChild(document.createTextNode(`${byLabel}`));

  const displayName = creatorDisplayName(detail);
  if (isCommunityCreator(detail)) {
    wrap.appendChild(document.createTextNode(displayName));
  } else {
    const creatorLink = el("a", "creator-name text-link");
    creatorLink.href = creatorProfileUrl(detail);
    creatorLink.textContent = displayName;
    wrap.appendChild(creatorLink);
  }

  creator.appendChild(wrap);

  if (detail?.creatorHasVerifiedBadge) {
    appendParsedMarkup(creator, VERIFIED_BADGE_MARKUP);
  }

  return creator;
}

function buildPriceRow(detail) {
  const priceRow = el(
    "div",
    "text-overflow item-card-price font-header-2 text-subheader margin-top-none",
  );

  const price = itemPriceValue(detail);
  const priceStatus = String(detail?.priceStatus || "").trim();
  const statusLower = priceStatus.toLowerCase();
  const isFreeStatus = statusLower === "free";
  const isOffSaleStatus =
    statusLower === "offsale" ||
    statusLower === "off sale" ||
    statusLower === "off-sale" ||
    detail?.isOffSale === true;

  if (typeof price === "number" && price > 0) {
    priceRow.appendChild(el("span", "icon-robux-16x16"));
    const amount = el("span", "text-robux-tile");
    amount.textContent = String(price);
    priceRow.appendChild(amount);
    return priceRow;
  }

  const label = el("span", "text-label");
  const status = el("span", "text-overflow font-caption-body");

  if (price === 0 || isFreeStatus) {
    status.classList.add("text-robux-tile");
    status.textContent = robloxT("Feature.Build.Label.Free", "Free");
  } else if (isOffSaleStatus || !priceStatus) {
    status.textContent = robloxT("Feature.Build.Label.OffSale", "Off sale");
  } else if (priceStatus) {
    status.textContent = priceStatus;
  } else {
    status.textContent = robloxT("Feature.Build.Label.OffSale", "Off sale");
  }

  label.appendChild(status);
  priceRow.appendChild(label);
  return priceRow;
}

function buildItemCard(asset, imageUrl, detail) {
  const name = detail?.name || asset.name || `Item ${asset.id}`;
  const href = `https://www.roblox.com/catalog/${asset.id}/${catalogSlug(name)}`;

  const li = el("li", "list-item item-card");
  const container = el("div", "item-card-container");
  const link = el("a", "item-card-link");
  link.href = href;

  const thumbWrap = el("div", "item-card-thumb-container");
  const thumb2d = el("thumbnail-2d", "item-card-thumb");
  const span = el("span", "thumbnail-2d-container shimmer");
  span.setAttribute("thumbnail-type", "Asset");
  span.setAttribute("thumbnail-target-id", String(asset.id));
  attachThumbImage(span, imageUrl, name);
  thumb2d.appendChild(span);
  thumbWrap.append(
    thumb2d,
    el("span", "restriction-icon ng-hide"),
    el("span", "icon--label"),
  );

  const nameEl = el("div", "item-card-name");
  nameEl.title = name;
  const nameSpan = el("span");
  nameSpan.textContent = name;
  nameEl.appendChild(nameSpan);

  link.append(thumbWrap, nameEl);
  container.appendChild(link);
  container.appendChild(buildCreatorRow(detail));
  container.appendChild(buildPriceRow(detail));
  li.appendChild(container);
  return li;
}

function totalPages(assetCount) {
  return Math.max(1, Math.ceil(assetCount / PAGE_SIZE));
}

function buildPager(page, pages) {
  const holder = el("div", "pager-holder");
  const ul = el("ul", "pager");

  const prevLi = el("li", "pager-prev");
  const prevBtn = el("button", "btn-generic-left-sm");
  prevBtn.type = "button";
  prevBtn.title = "left";
  if (page <= 1) prevBtn.disabled = true;
  prevBtn.appendChild(el("span", "icon-left"));
  prevBtn.addEventListener("click", () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    renderCurrentPage();
  });
  prevLi.appendChild(prevBtn);

  const curLi = el("li", "pager-cur");
  const cur = el("span");
  cur.setAttribute(RP_PAGE_ATTR, "1");
  cur.textContent = String(page);
  curLi.appendChild(cur);

  const nextLi = el("li", "pager-next");
  const nextBtn = el("button", "btn-generic-right-sm");
  nextBtn.type = "button";
  nextBtn.title = "right";
  if (page >= pages) nextBtn.disabled = true;
  nextBtn.appendChild(el("span", "icon-right"));
  nextBtn.addEventListener("click", () => {
    if (currentPage >= pages) return;
    currentPage += 1;
    renderCurrentPage();
  });
  nextLi.appendChild(nextBtn);

  ul.append(prevLi, curLi, nextLi);
  holder.appendChild(ul);
  return holder;
}

function renderCurrentPage() {
  const host = document.querySelector(`[${RP_WEARING_ATTR}]`);
  if (!(host instanceof HTMLElement) || !cachedPayload) return;

  const { assets, thumbnails, details } = cachedPayload;
  const pages = totalPages(assets.length);
  currentPage = Math.min(Math.max(1, currentPage), pages);

  host.textContent = "";

  const list = el("ul", "hlist item-cards-stackable roprime-wearing-item-list");
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageAssets = assets.slice(start, start + PAGE_SIZE);
  for (const asset of pageAssets) {
    if (!asset?.id) continue;
    const id = Number(asset.id);
    list.appendChild(
      buildItemCard(asset, thumbnails.get(id) || "", details.get(id) || null),
    );
  }
  host.appendChild(list);
  host.appendChild(buildPager(currentPage, pages));
}

function renderWearingCards(host, assets, thumbnails, details) {
  cachedPayload = { assets, thumbnails, details };
  currentPage = 1;
  host.setAttribute(RP_WEARING_ATTR, "1");
  renderCurrentPage();
}

export async function syncProfileWearingCards(layoutOrTabContent) {
  const layout =
    layoutOrTabContent instanceof HTMLElement
      ? layoutOrTabContent
      : document.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`);
  if (!(layout instanceof HTMLElement)) return;

  const userId = parseUserProfileIdFromLocation();
  if (!userId) return;

  const host = ensureWearingHost(layout);
  if (!(host instanceof HTMLElement)) return;
  if (lastUserId === userId && host.childElementCount > 0 && cachedPayload) {
    return;
  }

  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      // Empty shimmer shells immediately while data loads.
      renderShimmerPlaceholders(host);
      await ensureRobloxTranslations();
      const assets = await fetchWearingAssets(userId);
      const assetIds = assets.map((asset) => Number(asset.id)).filter(Boolean);
      const [thumbnails, details] = await Promise.all([
        fetchAssetThumbnails(assetIds),
        fetchCatalogDetails(assetIds),
      ]);
      renderWearingCards(host, assets, thumbnails, details);
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
  cachedPayload = null;
  currentPage = 1;
  document.querySelector(`[${RP_WEARING_ATTR}]`)?.remove();
}
