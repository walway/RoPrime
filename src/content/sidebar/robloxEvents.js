import {
  getActiveSidebarSize,
  getExtensionResourceUrl,
  settingsState,
  shouldRunRoPrimeOnCurrentPage,
} from "../core/core.js";
import { isSidebarItemHidden } from "./sidebarContent.js";
import { setHidden } from "../ui/visibility.js";

export const ROBLOX_EVENTS_CDN_URL =
  "https://raw.githubusercontent.com/walway/roprime-data/main/v1/roblox-events.json";
const LOCAL_EVENTS_PATH = "src/strings/data/roblox-events.json";
const EVENTS_ROOT_CLASS = "roblox-events";
const EVENTS_LIST_ITEM_ATTR = "data-roprime-events-item";
const PREVIEW_COUNT = 3;
const EVENT_LOGO_PATH = "resources/EventLogo2024.svg";

const NEW_SIDEBAR_PARENT_SELECTOR = [
  ".width-\\[288px\\] > .padding-x-large.padding-y-medium.flex.flex-col.gap-large",
  '[class~="width-[288px]"] > .padding-x-large.padding-y-medium.flex.flex-col.gap-large',
].join(", ");

let eventsCache = null;
let eventsFetchPromise = null;
let expanded = false;

function isSafeHref(href) {
  const value = String(href || "").trim();
  if (!value) return false;
  if (/^(javascript|data|vbscript):/i.test(value)) return false;
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

function isSafeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  if (/^(javascript|data|vbscript):/i.test(value)) return false;
  return value.startsWith("/") || /^https?:\/\//i.test(value);
}

function parseEventDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return ms;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const href = String(raw.href || raw.url || "").trim();
  const image = String(raw.image || raw.imageUrl || raw.src || "").trim();
  const title = String(raw.title || raw.alt || "").trim();
  const alt = String(raw.alt || raw.title || "").trim();
  const startsAt = parseEventDate(
    raw.startsAt ?? raw.startAt ?? raw.start ?? raw.starts,
  );
  const endsAt = parseEventDate(raw.endsAt ?? raw.endAt ?? raw.end ?? raw.ends);
  if (!isSafeHref(href) || !isSafeImageUrl(image)) return null;
  if (startsAt == null || endsAt == null) return null;
  if (endsAt < startsAt) return null;
  return {
    href,
    image,
    title,
    alt: alt || title,
    startsAt,
    endsAt,
  };
}

function isEventActive(event, now = Date.now()) {
  return now >= event.startsAt && now <= event.endsAt;
}

function getActiveEvents(events, now = Date.now()) {
  return events.filter((event) => isEventActive(event, now));
}

function parseEventsJson(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.events)
      ? raw.events
      : null;
  if (!list) return [];
  return list.map(normalizeEvent).filter(Boolean);
}

async function fetchEventsFromUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const events = parseEventsJson(await response.json());
    return events.length ? events : null;
  } catch {
    return null;
  }
}

async function fetchLocalEventsFallback() {
  const localUrl = getExtensionResourceUrl(LOCAL_EVENTS_PATH);
  if (!localUrl) return [];
  return (await fetchEventsFromUrl(localUrl)) || [];
}

export async function fetchRobloxEvents() {
  if (eventsCache) return eventsCache;
  if (eventsFetchPromise) return eventsFetchPromise;

  eventsFetchPromise = (async () => {
    const remoteEvents = await fetchEventsFromUrl(ROBLOX_EVENTS_CDN_URL);
    if (remoteEvents) {
      eventsCache = remoteEvents;
      return remoteEvents;
    }
    eventsCache = await fetchLocalEventsFallback();
    return eventsCache;
  })();

  try {
    return await eventsFetchPromise;
  } finally {
    eventsFetchPromise = null;
  }
}

function findOldNavList() {
  const list = document.querySelector(
    "#left-navigation-container.roprime-old-navigation-bar ul.left-col-list, #left-navigation-container ul.left-col-list",
  );
  return list instanceof HTMLElement ? list : null;
}

function findNewSidebarParent() {
  const parent = document.querySelector(NEW_SIDEBAR_PARENT_SELECTOR);
  return parent instanceof HTMLElement ? parent : null;
}

function shouldShowRobloxEvents(options = {}) {
  if (!settingsState.robloxEventsEnabled) return false;
  if (!shouldRunRoPrimeOnCurrentPage()) return false;
  if (isSidebarItemHidden("game-events")) return false;
  if (options.preferOldNav || settingsState.oldNavigationBarEnabled) {
    return true;
  }
  if (getActiveSidebarSize() === "icon") return false;
  return true;
}

export function removeRobloxEvents() {
  document.querySelectorAll(`div.${EVENTS_ROOT_CLASS}`).forEach((node) => {
    node.remove();
  });
  document.querySelectorAll(`[${EVENTS_LIST_ITEM_ATTR}]`).forEach((node) => {
    node.remove();
  });
}

function eventsRenderKey(events) {
  return events.map((event) => event.href).join("|");
}

function createEventAnchor(event) {
  const anchor = document.createElement("a");
  anchor.href = event.href;

  const thumb = document.createElement("span");
  thumb.className = "thumbnail-2d-container";

  const img = document.createElement("img");
  img.src = event.image;
  img.alt = event.alt || event.title;
  img.title = event.title;

  thumb.appendChild(img);
  anchor.appendChild(thumb);
  return anchor;
}

function applyCollapsedState(root, eventCount) {
  const links = root.querySelectorAll("ul a");
  links.forEach((link, index) => {
    if (!(link instanceof HTMLElement)) return;
    setHidden(link, !expanded && index >= PREVIEW_COUNT);
  });

  const button = root.querySelector("button.show-more-btn");
  if (!(button instanceof HTMLButtonElement)) return;
  const needsButton = eventCount > PREVIEW_COUNT;
  setHidden(button, !needsButton);
  if (needsButton) {
    button.textContent = expanded ? "Show less" : "Show more";
  }
}

function bindShowMore(root, eventCount) {
  const button = root.querySelector("button.show-more-btn");
  if (!(button instanceof HTMLButtonElement)) return;
  if (button.classList.contains("roprime-events-bound")) return;
  button.classList.add("roprime-events-bound");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    expanded = !expanded;
    applyCollapsedState(root, eventCount);
  });
}

function buildEventsTree(events) {
  const fragment = document.createDocumentFragment();

  const logo = document.createElement("img");
  logo.className = "roblox-events-logo";
  logo.src = getExtensionResourceUrl(EVENT_LOGO_PATH) || "";
  logo.alt = "";
  logo.width = 24;
  logo.height = 25;
  fragment.appendChild(logo);

  const heading = document.createElement("h5");
  heading.textContent = "Events";
  fragment.appendChild(heading);

  const list = document.createElement("ul");
  const item = document.createElement("li");
  for (const event of events) {
    item.appendChild(createEventAnchor(event));
  }
  list.appendChild(item);
  fragment.appendChild(list);

  if (events.length > PREVIEW_COUNT) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "show-more-btn btn-secondary-md btn-full-width";
    button.textContent = "Show more";
    fragment.appendChild(button);
  }

  return fragment;
}

function ensureEventsRoot(parent, { asListItem }) {
  if (asListItem) {
    let item = parent.querySelector(`:scope > li[${EVENTS_LIST_ITEM_ATTR}]`);
    if (!(item instanceof HTMLElement)) {
      item = document.createElement("li");
      item.setAttribute(EVENTS_LIST_ITEM_ATTR, "1");
      parent.appendChild(item);
    } else if (
      item.parentElement === parent &&
      parent.lastElementChild !== item
    ) {
      parent.appendChild(item);
    }
    let root = item.querySelector(`:scope > div.${EVENTS_ROOT_CLASS}`);
    if (!(root instanceof HTMLElement)) {
      root = document.createElement("div");
      root.className = EVENTS_ROOT_CLASS;
      item.appendChild(root);
    }
    return root;
  }

  let root = parent.querySelector(`:scope > div.${EVENTS_ROOT_CLASS}`);
  if (!(root instanceof HTMLElement)) {
    root = document.createElement("div");
    root.className = EVENTS_ROOT_CLASS;
    parent.appendChild(root);
  }
  return root;
}

function renderRobloxEvents(parent, events, options = {}) {
  if (!events.length) {
    removeRobloxEvents();
    return;
  }

  const root = ensureEventsRoot(parent, {
    asListItem: !!options.asListItem,
  });

  const structureKey = eventsRenderKey(events);
  if (root.getAttribute("data-events-key") !== structureKey) {
    root.setAttribute("data-events-key", structureKey);
    root.replaceChildren(buildEventsTree(events));
    bindShowMore(root, events.length);
  }

  applyCollapsedState(root, events.length);
}

function resolveMountTarget(options = {}) {
  const preferOld =
    options.preferOldNav || settingsState.oldNavigationBarEnabled;

  if (preferOld) {
    const oldList = findOldNavList();
    if (oldList) return { parent: oldList, asListItem: true };
  }

  const newSidebar = findNewSidebarParent();
  if (newSidebar) return { parent: newSidebar, asListItem: false };

  const oldList = findOldNavList();
  if (oldList) return { parent: oldList, asListItem: true };

  return null;
}

export async function syncRobloxEvents(options = {}) {
  if (!shouldShowRobloxEvents(options)) {
    removeRobloxEvents();
    return;
  }

  const mount = resolveMountTarget(options);
  if (!mount) {
    removeRobloxEvents();
    return;
  }

  const events = getActiveEvents(await fetchRobloxEvents());
  if (!shouldShowRobloxEvents(options)) {
    removeRobloxEvents();
    return;
  }

  const liveMount = resolveMountTarget(options);
  if (!liveMount) {
    removeRobloxEvents();
    return;
  }

  renderRobloxEvents(liveMount.parent, events, {
    asListItem: liveMount.asListItem,
  });
}

import { registerFeature } from '../features/registry.js';
registerFeature(syncRobloxEvents);

