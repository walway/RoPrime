import { settingsState } from "../core/core.js";
import { getRobloxUserId } from "../profile/robloxUserId.js";
import { showOfficialStorePopupLegacy } from "../popups/officialStore/OfficialStorePopupLegacy.js";
import { syncRobloxEvents } from "../sidebar/robloxEvents.js";

const LEGACY_HOST_ID = "roprime-classic-left-nav-host";
const ROOT_CLASS = "roprime-old-navigation-bar";
const COLLAPSED_CLASS = "roprime-old-navigation-bar-collapsed";
const LEFT_NAV_HIDE_STYLE_ID = "roprime-hide-left-nav-for-old-nav";
const OLD_NAVBAR_PANEL_STYLE_ID = "roprime-old-navbar-panel-style";
const OLD_NAVBAR_PANEL_PX = 175;
const HEADSHOT_API = "https://thumbnails.roblox.com/v1/users/avatar-headshot";
const USER_API = "https://users.roblox.com/v1/users";
const UNREAD_MESSAGES_API =
  "https://privatemessages.roblox.com/v1/messages/unread/count";
const FRIEND_REQUESTS_API =
  "https://friends.roblox.com/v1/user/friend-requests/count";
const TRADE_REQUESTS_API = "https://trades.roblox.com/v1/trades/inbound/count";

let lastNavRenderKey = "";
let hydrateSeq = 0;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "className") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset" && typeof value === "object") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        node.dataset[dataKey] = String(dataValue);
      }
    } else if (typeof value === "boolean") {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  }
  return node;
}

function getNativeLeftNavigationContainer() {
  const node = document.getElementById("left-navigation-container");
  return node instanceof HTMLElement ? node : null;
}

function nativeLeftNavigationReady() {
  const native = getNativeLeftNavigationContainer();
  if (!native) return false;
  if (native.classList.contains(ROOT_CLASS)) return true;
  return native.childElementCount > 0;
}

function setLeftNavHidden(hidden) {
  const existing = document.getElementById(LEFT_NAV_HIDE_STYLE_ID);
  if (!hidden) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = LEFT_NAV_HIDE_STYLE_ID;
  style.textContent =
    ".left-nav{display:none!important;visibility:hidden!important;}";
  (document.head || document.documentElement).appendChild(style);
}

function getOldNavbarPanelCss() {
  return `
@media (min-width: 1688px) {
.no-gutter-ads.left-nav-new-width main.container-main {
    margin-left: ${OLD_NAVBAR_PANEL_PX}px !important;
    }
}

@media (min-width: 1688px) {
    .no-gutter-ads.logged-in.left-nav-new-width, body.left-nav-new-width {
        --left-nav-reserved-width: ${OLD_NAVBAR_PANEL_PX}px !important;
    }
}

@media (min-width: 1688px) {
      .rbx-header .rbx-nav-collapse .menu-button {
        display: none !important;
    }
}

@media (min-width: 1688px) {
    html body .rbx-header .icon-logo {
        display: block !important;
    }
}

@media (max-width: 1688px) {
    .left-nav-new-width .rbx-header .icon-logo-r, .left-nav-new-width .rbx-header .nav-container .nav-icon {
        display: block !important;
    }
}

@media (min-width: 1688px) {
    html body .rbx-header .icon-logo-r,
    html body .rbx-header .nav-container .nav-icon {
        display: none !important;
    }
}

.no-gutter-ads.left-nav-new-width main.container-main {
    margin-left: 0px;
}

.no-gutter-ads.logged-in.left-nav-new-width, body.left-nav-new-width {
    --left-nav-reserved-width: 0px;
}

.left-nav-new-width .rbx-header .rbx-nav-collapse .menu-button {
    display: inline-block;
}

.rbx-header .icon-logo {
    display: none !important;
}
`.trim();
}

function setOldNavbarPanelStyle(enabled) {
  const existing = document.getElementById(OLD_NAVBAR_PANEL_STYLE_ID);
  if (!enabled) {
    existing?.remove();
    return;
  }
  const css = getOldNavbarPanelCss();
  if (existing instanceof HTMLStyleElement) {
    if (existing.textContent !== css) existing.textContent = css;
    return;
  }
  const style = document.createElement("style");
  style.id = OLD_NAVBAR_PANEL_STYLE_ID;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

function teardownOldNavigationBar() {
  document.getElementById(LEGACY_HOST_ID)?.remove();
  setOldNavbarPanelStyle(false);

  const native = getNativeLeftNavigationContainer();
  if (native instanceof HTMLElement && native.classList.contains(ROOT_CLASS)) {
    native.classList.remove(ROOT_CLASS);
    native.replaceChildren();
  }

  setLeftNavHidden(false);
  document.documentElement.classList.remove(
    "roprime-classic-left-nav-on",
    COLLAPSED_CLASS,
  );
  lastNavRenderKey = "";
  hydrateSeq += 1;
  try {
    delete window.__oldRobloxOldNavigationBar;
  } catch {
    /* ignore */
  }
}

function stripLegacyInjections() {
  document.getElementById("roprime-left-gray-frame")?.remove();
  document.getElementById("roprime-left-gray-frame-layout-style")?.remove();
  document.documentElement.classList.remove("roprime-left-gray-frame-on");
  document.getElementById("roprime-old-navbar-style")?.remove();
  document.getElementById("roprime-old-navbar-host")?.remove();
  document.documentElement.classList.remove(
    "roprime-old-navbar-active",
    "roprime-old-navbar-rail-expanded",
    "roprime-old-navbar-menu-open",
  );
  const slot = document.getElementById("roprime-nav-menu-slot");
  if (slot) {
    const native = slot.querySelector(
      "button.menu-button.btn-navigation-nav-menu-md",
    );
    const parent = slot.parentElement;
    if (native instanceof HTMLButtonElement && parent) {
      native.classList.remove("roprime-native-nav-menu-hidden");
      parent.insertBefore(native, slot);
    }
    slot.remove();
  }
  document
    .querySelectorAll("button.roprime-native-nav-menu-hidden")
    .forEach((button) => {
      button.classList.remove("roprime-native-nav-menu-hidden");
    });
  document.getElementById("roprime-custom-nav-menu-btn")?.remove();
}

function shouldMountOldNavigationBar() {
  if (!document.body) return false;
  const path = window.location.pathname || "";
  if (
    /\/login\b/i.test(path) ||
    /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?newlogin\b/i.test(path)
  ) {
    return false;
  }
  return true;
}

function origin() {
  return window.location.origin;
}

function communitiesLabel() {
  return settingsState.renameDropdownEnabled &&
    settingsState.renameCommunitiesToGroups
    ? "Groups"
    : "Communities";
}

function navIcon(iconClass) {
  return el("div", {}, [el("span", { className: iconClass })]);
}

function navLabel(text, title = text) {
  return el("span", {
    className: "font-header-2 dynamic-ellipsis-item",
    title,
    text,
  });
}

function navLinkItem({
  href,
  id,
  iconClass,
  label,
  target = "_self",
  badgeKey,
}) {
  const children = [navIcon(iconClass), navLabel(label)];
  if (badgeKey) {
    children.push(el("span", { "data-roprime-nav-badge": badgeKey }));
  }
  return el("li", {}, [
    el(
      "a",
      {
        className: "dynamic-overflow-container text-nav",
        href,
        id,
        target,
      },
      children,
    ),
  ]);
}

function createNotificationBadge(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return null;
  const label = String(Math.floor(n));
  return el("div", { className: "dynamic-width-item align-right" }, [
    el("span", {
      className: "notification-blue notification",
      title: label,
      text: label,
    }),
  ]);
}

function buildNavTree(userId) {
  const id = Number(userId) > 0 ? String(userId) : "";
  const profileHref = id
    ? `${origin()}/users/${id}/profile`
    : `${origin()}/users/profile`;
  const inventoryHref = id
    ? `${origin()}/users/${id}/inventory`
    : `${origin()}/users/inventory`;
  const groupLabel = communitiesLabel();

  const profileHeader = el("li", {}, [
    el(
      "a",
      {
        className: "dynamic-overflow-container text-nav",
        href: profileHref,
        role: "link",
        "data-roprime-nav-profile-header": "1",
      },
      [
        el("span", { className: "avatar avatar-headshot-xs" }, [
          el("span", {
            className: "thumbnail-2d-container shimmer avatar-card-image",
            "data-roprime-nav-headshot": "1",
          }),
        ]),
        el(
          "span",
          {
            className:
              "flex flex-col gap-xsmall min-width-0 large:flex-row large:align-items-center",
          },
          [
            el(
              "span",
              {
                className: "flex gap-xsmall min-width-0 align-items-center",
              },
              [
                el("div", {
                  className: "font-header-2 dynamic-ellipsis-item",
                  "data-roprime-nav-display-name": "1",
                }),
              ],
            ),
          ],
        ),
      ],
    ),
  ]);

  const leftColList = el("ul", { className: "left-col-list" }, [
    navLinkItem({
      href: `${origin()}/home`,
      id: "nav-home",
      iconClass: "icon-nav-home",
      label: "Home",
    }),
    navLinkItem({
      href: profileHref,
      id: "nav-profile",
      iconClass: "icon-nav-profile",
      label: "Profile",
    }),
    navLinkItem({
      href: `${origin()}/my/messages/#!/inbox`,
      id: "nav-message",
      iconClass: "icon-nav-message",
      label: "Messages",
      badgeKey: "messages",
    }),
    navLinkItem({
      href: `${origin()}/users/friends`,
      id: "nav-friends",
      iconClass: "icon-nav-friends",
      label: "Connect",
      badgeKey: "friends",
    }),
    navLinkItem({
      href: `${origin()}/my/avatar`,
      id: "nav-character",
      iconClass: "icon-nav-charactercustomizer",
      label: "Avatar",
    }),
    navLinkItem({
      href: inventoryHref,
      id: "nav-inventory",
      iconClass: "icon-nav-inventory",
      label: "Inventory",
    }),
    navLinkItem({
      href: `${origin()}/trades`,
      id: "nav-trade",
      iconClass: "icon-nav-trade",
      label: "Trade",
      badgeKey: "trades",
    }),
    navLinkItem({
      href: `${origin()}/my/communities`,
      id: "nav-group",
      iconClass: "icon-nav-group",
      label: groupLabel,
    }),
    navLinkItem({
      href: "https://blog.roblox.com",
      id: "nav-blog",
      iconClass: "icon-nav-blog",
      label: "Blog",
      target: "_blank",
    }),
    el("li", {}, [
      el(
        "button",
        {
          id: "nav-shop",
          type: "button",
          className: "dynamic-overflow-container text-nav",
        },
        [navIcon("icon-nav-shop"), navLabel("Official Store")],
      ),
    ]),
    navLinkItem({
      href: `${origin()}/giftcards-us`,
      id: "nav-giftcards",
      iconClass: "icon-nav-giftcards",
      label: "Buy Gift Cards",
    }),
    el("li", { className: "rbx-upgrade-now" }, [
      el("a", {
        href: `${origin()}/plus`,
        className: "btn-growth-md btn-secondary-md",
        id: "upgrade-now-button",
        text: "Roblox Plus",
      }),
    ]),
  ]);

  return el("div", { id: "navigation", className: "rbx-left-col" }, [
    el("ul", {}, [profileHeader, el("li", { className: "rbx-divider" })]),
    el("div", { "data-simplebar": "init", className: "rbx-scrollbar" }, [
      el(
        "div",
        { className: "simplebar-wrapper", style: { margin: "0px" } },
        [
          el("div", { className: "simplebar-height-auto-observer-wrapper" }, [
            el("div", { className: "simplebar-height-auto-observer" }),
          ]),
          el("div", { className: "simplebar-mask" }, [
            el(
              "div",
              {
                className: "simplebar-offset",
                style: { right: "0px", bottom: "0px" },
              },
              [
                el(
                  "div",
                  {
                    className: "simplebar-content-wrapper",
                    tabindex: "0",
                    role: "region",
                    "aria-label": "scrollable content",
                    style: { height: "100%", overflow: "hidden" },
                  },
                  [
                    el(
                      "div",
                      {
                        className: "simplebar-content",
                        style: { padding: "0px" },
                      },
                      [leftColList],
                    ),
                  ],
                ),
              ],
            ),
          ]),
          el("div", {
            className: "simplebar-placeholder",
            style: { width: "auto", height: "437px" },
          }),
        ],
      ),
      el(
        "div",
        {
          className: "simplebar-track simplebar-horizontal",
          style: { visibility: "hidden" },
        },
        [
          el("div", {
            className: "simplebar-scrollbar",
            style: { width: "0px", display: "none" },
          }),
        ],
      ),
      el(
        "div",
        {
          className: "simplebar-track simplebar-vertical",
          style: { visibility: "hidden" },
        },
        [
          el("div", {
            className: "simplebar-scrollbar",
            style: { height: "0px", display: "none" },
          }),
        ],
      ),
    ]),
  ]);
}

async function fetchJsonCount(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return 0;
    const data = await response.json();
    const count = Number(data?.count);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

async function fetchDisplayName(userId) {
  try {
    const response = await fetch(`${USER_API}/${userId}`, {
      credentials: "include",
    });
    if (!response.ok) return "";
    const data = await response.json();
    return String(data?.displayName || data?.name || "").trim();
  } catch {
    return "";
  }
}

async function fetchHeadshotUrl(userId) {
  try {
    const response = await fetch(
      `${HEADSHOT_API}?userIds=${userId}&includeBackground=true&includeProfileFrame=true&size=150x150&format=Webp`,
      { credentials: "include" },
    );
    if (!response.ok) return "";
    const data = await response.json();
    return String(data?.data?.[0]?.imageUrl || "").trim();
  } catch {
    return "";
  }
}

function setBadge(host, key, count) {
  const slot = host.querySelector(`[data-roprime-nav-badge="${key}"]`);
  if (!(slot instanceof HTMLElement)) return;
  const badge = createNotificationBadge(count);
  if (!badge) {
    slot.replaceChildren();
    return;
  }
  slot.replaceWith(badge);
}

function applyHeadshot(host, imageUrl, alt) {
  const wrap = host.querySelector("[data-roprime-nav-headshot]");
  if (!(wrap instanceof HTMLElement)) return;

  if (!imageUrl) {
    wrap.className = "thumbnail-2d-container avatar-card-image";
    wrap.replaceChildren();
    return;
  }

  wrap.className = "thumbnail-2d-container shimmer avatar-card-image";
  const img = document.createElement("img");
  img.className = "loading";
  img.alt = alt || "";
  img.src = imageUrl;
  const finish = () => {
    wrap.className = "thumbnail-2d-container avatar-card-image";
    img.classList.remove("loading");
  };
  img.addEventListener("load", finish, { once: true });
  img.addEventListener("error", finish, { once: true });
  wrap.replaceChildren(img);
}

function bindShopButton(host) {
  const btn = host.querySelector("#nav-shop");
  if (!(btn instanceof HTMLButtonElement)) return;
  if (btn.classList.contains("roprime-shop-bound")) return;
  btn.classList.add("roprime-shop-bound");
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    showOfficialStorePopupLegacy();
  });
}

function bindNativeMenuButtonToggle() {
  const root = document.documentElement;
  if (root.classList.contains("roprime-old-nav-menu-bound")) return;
  root.classList.add("roprime-old-nav-menu-bound");

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest(
        "button.menu-button.btn-navigation-nav-menu-md",
      );
      if (!btn) return;
      if (!settingsState.oldNavigationBarEnabled) return;
      root.classList.toggle(COLLAPSED_CLASS);
    },
    true,
  );
}

async function hydrateNav(host, userId, seq) {
  const [displayName, headshotUrl, messages, friends, trades] =
    await Promise.all([
      fetchDisplayName(userId),
      fetchHeadshotUrl(userId),
      fetchJsonCount(UNREAD_MESSAGES_API),
      fetchJsonCount(FRIEND_REQUESTS_API),
      fetchJsonCount(TRADE_REQUESTS_API),
    ]);

  if (seq !== hydrateSeq) return;
  if (!host.isConnected) return;

  const nameEl = host.querySelector("[data-roprime-nav-display-name]");
  if (nameEl instanceof HTMLElement) {
    nameEl.textContent = displayName || "Profile";
  }

  applyHeadshot(host, headshotUrl, displayName);
  setBadge(host, "messages", messages);
  setBadge(host, "friends", friends);
  setBadge(host, "trades", trades);
}

function renderInto(container, userId) {
  const renderKey = String(userId || "");
  const hasNav = !!container.querySelector("#navigation.rbx-left-col");
  if (renderKey === lastNavRenderKey && hasNav) {
    bindShopButton(container);
    void syncRobloxEvents({ preferOldNav: true });
    return;
  }
  lastNavRenderKey = renderKey;
  container.classList.add(ROOT_CLASS);
  container.replaceChildren(buildNavTree(userId));
  bindShopButton(container);
  void syncRobloxEvents({ preferOldNav: true });

  if (Number(userId) > 0) {
    const seq = ++hydrateSeq;
    void hydrateNav(container, userId, seq);
  }
}

export function syncOldNavigationBar() {
  stripLegacyInjections();
  document.getElementById(LEGACY_HOST_ID)?.remove();

  const root = document.documentElement;

  if (
    !settingsState.oldNavigationBarEnabled ||
    !shouldMountOldNavigationBar()
  ) {
    teardownOldNavigationBar();
    return;
  }

  if (!nativeLeftNavigationReady()) {
    teardownOldNavigationBar();
    return;
  }

  const container = getNativeLeftNavigationContainer();
  if (!(container instanceof HTMLElement)) {
    teardownOldNavigationBar();
    return;
  }

  setLeftNavHidden(true);
  setOldNavbarPanelStyle(true);
  root.classList.add("roprime-classic-left-nav-on");
  bindNativeMenuButtonToggle();

  const peekId = Number(window.__roprimeNavUserId) || 0;
  renderInto(container, peekId || "");

  void (async () => {
    const userId = await getRobloxUserId();
    if (!settingsState.oldNavigationBarEnabled) return;
    const live = getNativeLeftNavigationContainer();
    if (!(live instanceof HTMLElement) || !nativeLeftNavigationReady()) {
      teardownOldNavigationBar();
      return;
    }
    if (userId) {
      try {
        window.__roprimeNavUserId = userId;
      } catch {
        /* ignore */
      }
    }
    renderInto(live, userId || "");
  })();

  try {
    window.__oldRobloxOldNavigationBar = container;
  } catch {
    /* ignore */
  }
}
