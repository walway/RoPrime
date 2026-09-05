import { parseUserProfileIdFromLocation } from "../core/core.js";

const AVATAR_DETAILS_URL = "https://avatar.roblox.com/v2/avatar/users";
const THUMBNAILS_URL = "https://thumbnails.roblox.com/v1/assets";
const CATALOG_DETAILS_URL = "https://catalog.roblox.com/v1/catalog/items/details";

const RP_WEARING_ATTR = "data-roprime-wearing-cards";
const RP_WEARING_LAYOUT_ATTR = "data-roprime-profile-tab-layout";
const RP_PAGE_ATTR = "data-roprime-wearing-page";

const PAGE_SIZE = 6;

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

function creatorProfileUrl(detail) {
  const id = Number(detail?.creatorTargetId);
  if (!Number.isFinite(id) || id <= 0) return "https://www.roblox.com/users/1/profile";
  if (String(detail?.creatorType || "").toLowerCase() === "group") {
    return `https://www.roblox.com/groups/${id}`;
  }
  return `https://www.roblox.com/users/${id}/profile`;
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
  // Thumbnails API caps batch size; chunk to stay safe.
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
      // Keep cards usable without creator/price.
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

function buildItemCard(asset, imageUrl, detail) {
  const name = detail?.name || asset.name || `Item ${asset.id}`;
  const href = `https://www.roblox.com/catalog/${asset.id}/${catalogSlug(name)}`;

  const li = el("li", "list-item item-card");
  const container = el("div", "item-card-container");
  const link = el("a", "item-card-link");
  link.href = href;

  const thumbWrap = el("div", "item-card-thumb-container");
  const thumb2d = el("thumbnail-2d", "item-card-thumb");
  const span = el("span", "thumbnail-2d-container");
  span.setAttribute("thumbnail-type", "Asset");
  span.setAttribute("thumbnail-target-id", String(asset.id));
  if (imageUrl) {
    const img = el("img");
    img.src = imageUrl;
    img.alt = name;
    img.title = name;
    img.loading = "lazy";
    span.appendChild(img);
  }
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

  const creatorName = detail?.creatorName || "Roblox";
  const creator = el("div", "text-overflow item-card-label");
  const by = el("span");
  by.textContent = "By";
  const creatorLink = el("a", "creator-name text-overflow text-link");
  creatorLink.href = creatorProfileUrl(detail);
  creatorLink.textContent = creatorName;
  creator.append(by, document.createTextNode(" "), creatorLink);
  container.appendChild(creator);

  const priceRow = el("div", "text-overflow item-card-price");
  const priceStatus = detail?.priceStatus;
  const price = detail?.price;
  const isFree =
    String(priceStatus || "").toLowerCase() === "free" || price === 0;
  const hasNumericPrice =
    typeof price === "number" && price > 0 && !priceStatus;

  if (priceStatus && !hasNumericPrice) {
    const label = el("span", "text-label");
    const status = el("span", "text-overflow font-caption-body");
    if (isFree) status.classList.add("text-robux-tile");
    status.textContent = priceStatus;
    label.appendChild(status);
    priceRow.appendChild(label);
  } else if (isFree && !hasNumericPrice) {
    const label = el("span", "text-label");
    const status = el("span", "text-overflow font-caption-body text-robux-tile");
    status.textContent = "Free";
    label.appendChild(status);
    priceRow.appendChild(label);
  } else if (hasNumericPrice) {
    priceRow.appendChild(el("span", "icon-robux-16x16"));
    const amount = el("span", "text-robux-tile");
    amount.textContent = String(price);
    priceRow.appendChild(amount);
  } else {
    const label = el("span", "text-label");
    const status = el("span", "text-overflow font-caption-body");
    status.textContent = "Off Sale";
    label.appendChild(status);
    priceRow.appendChild(label);
  }

  container.appendChild(priceRow);
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
  document.querySelector(`[${RP_WEARING_LAYOUT_ATTR}]`)?.remove();
}
