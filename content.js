(() => {
  // src/content/core.js
  var RP_TAB_ID = "roprime-settings-tab";
  var RP_PANEL_CLASS = "roprime-settings-wrapper";
  var RP_PANE_ID = "roprime-settings-pane";
  var RP_STANDALONE_ID = "roprime-standalone-settings";
  var RP_SMALL_NEW_NAV_STYLE_ID = "roprime-small-new-nav-style";
  var RP_SIDEBAR_COMPACT_STYLE_ID = "roprime-sidebar-compact-style";
  var RP_FRIEND_STYLING_REIMAGNED_STYLE_ID = "roprime-friend-styling-reimagned-style";
  var RP_PARAM_KEY = "roprime";
  var RP_DEFAULT_PAGE = "design";
  var RP_SUPPORTED_PAGES = new Set(["design", "info"]);
  var RP_SETTINGS_KEY = "rpSettings";
  var RP_DEFAULT_SETTINGS = {
    renameDropdownEnabled: true,
    renameDropdownRestore: {
      renameCommunitiesToGroups: true,
      renameExperiencesToGames: true,
      renameMarketplaceToAvatarShop: true
    },
    oldNavigationBarEnabled: false,
    smallNewNavigationBarEnabled: false,
    sidebarIconsOnlyEnabled: false,
    friendStylingReimagnedEnabled: false
  };
  var syncIntervalId = null;
  var renameIntervalId = null;
  var settingsState = { ...RP_DEFAULT_SETTINGS };
  function setSyncIntervalId(value) {
    syncIntervalId = value;
  }
  function setRenameIntervalId(value) {
    renameIntervalId = value;
  }
  function getStorageApi() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  }
  function loadSettings() {
    const storage = getStorageApi();
    if (!storage)
      return Promise.resolve();
    return new Promise((resolve) => {
      storage.get([RP_SETTINGS_KEY], (result) => {
        const stored = result?.[RP_SETTINGS_KEY];
        if (stored && typeof stored === "object") {
          Object.assign(settingsState, RP_DEFAULT_SETTINGS, stored);
          if (stored.oldNavigationBarEnabled === undefined) {
            if (stored.classicLeftNavEnabled != null) {
              settingsState.oldNavigationBarEnabled = !!stored.classicLeftNavEnabled;
            } else if (stored.leftGrayFrameEnabled != null) {
              settingsState.oldNavigationBarEnabled = !!stored.leftGrayFrameEnabled;
            }
          }
          delete settingsState.classicLeftNavEnabled;
          delete settingsState.leftGrayFrameEnabled;
        }
        resolve();
      });
    });
  }
  function saveSettings() {
    const storage = getStorageApi();
    if (!storage)
      return;
    storage.set({
      [RP_SETTINGS_KEY]: {
        renameDropdownEnabled: settingsState.renameDropdownEnabled,
        renameDropdownRestore: settingsState.renameDropdownRestore,
        renameCommunitiesToGroups: settingsState.renameCommunitiesToGroups,
        renameExperiencesToGames: settingsState.renameExperiencesToGames,
        renameMarketplaceToAvatarShop: settingsState.renameMarketplaceToAvatarShop,
        oldNavigationBarEnabled: settingsState.oldNavigationBarEnabled,
        smallNewNavigationBarEnabled: settingsState.smallNewNavigationBarEnabled,
        sidebarIconsOnlyEnabled: settingsState.sidebarIconsOnlyEnabled,
        friendStylingReimagnedEnabled: settingsState.friendStylingReimagnedEnabled
      }
    });
  }
  function isAccountPage() {
    const path = window.location.pathname;
    return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?my\/account(?:\/|$)/i.test(path);
  }
  function isPluginRoute() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    return RP_SUPPORTED_PAGES.has(route);
  }
  function getCurrentrp() {
    const params = new URLSearchParams(window.location.search);
    const route = (params.get(RP_PARAM_KEY) || "").toLowerCase();
    if (RP_SUPPORTED_PAGES.has(route))
      return route;
    return null;
  }
  function buildPluginUrl(page = RP_DEFAULT_PAGE) {
    const url = new URL(window.location.href);
    url.searchParams.set(RP_PARAM_KEY, page);
    return `${url.pathname}${url.search}`;
  }

  // src/content/rename.js
  function renameCommunityText(text) {
    return text.replace(/\bCommunities\b/g, "Groups").replace(/\bcommunities\b/g, "groups").replace(/\bCommunity\b/g, "Group").replace(/\bcommunity\b/g, "group");
  }
  function renameGroupsBackText(text) {
    return text.replace(/\bGroups\b/g, "Communities").replace(/\bgroups\b/g, "communities").replace(/\bGroup\b/g, "Community").replace(/\bgroup\b/g, "community");
  }
  function renameExperiencesText(text) {
    return text.replace(/\bExperiences\b/g, "Games").replace(/\bexperiences\b/g, "games").replace(/\bExperience\b/g, "Game").replace(/\bexperience\b/g, "game");
  }
  function renameGamesBackText(text) {
    return text.replace(/\bGames\b/g, "Experiences").replace(/\bgames\b/g, "experiences").replace(/\bGame\b/g, "Experience").replace(/\bgame\b/g, "experience");
  }
  function renameMarketplaceText(text) {
    return text.replace(/\bMarketplace\b/g, "Avatar Shop").replace(/\bmarketplace\b/g, "avatar shop");
  }
  function renameAvatarShopBackText(text) {
    return text.replace(/\bAvatar Shop\b/g, "Marketplace").replace(/\bavatar shop\b/g, "marketplace");
  }
  function shouldSkipNode(node) {
    if (!(node.parentElement instanceof HTMLElement))
      return true;
    const tag = node.parentElement.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA")
      return true;
    if (node.parentElement.closest(`#${RP_PANE_ID}`))
      return true;
    if (node.parentElement.closest(`#${RP_STANDALONE_ID}`))
      return true;
    return false;
  }
  function applyTextTransform(rootNode, transform, shouldApply = true) {
    if (!shouldApply)
      return;
    if (!(rootNode instanceof Node))
      return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (!shouldSkipNode(currentNode) && typeof currentNode.nodeValue === "string") {
        const original = currentNode.nodeValue;
        const renamed = transform(original);
        if (renamed !== original)
          currentNode.nodeValue = renamed;
      }
      currentNode = walker.nextNode();
    }
  }
  function applyMarketplaceRename(rootNode) {
    applyTextTransform(rootNode, renameMarketplaceText, settingsState.renameMarketplaceToAvatarShop);
  }
  function applyAvatarShopBackRename(rootNode) {
    applyTextTransform(rootNode, renameAvatarShopBackText, true);
  }
  function applyCommunityRename(rootNode) {
    applyTextTransform(rootNode, renameCommunityText, settingsState.renameCommunitiesToGroups);
  }
  function applyGroupsBackRename(rootNode) {
    applyTextTransform(rootNode, renameGroupsBackText, true);
  }
  function applyExperiencesRename(rootNode) {
    applyTextTransform(rootNode, renameExperiencesText, settingsState.renameExperiencesToGames);
  }
  function applyGamesBackRename(rootNode) {
    applyTextTransform(rootNode, renameGamesBackText, true);
  }
  function updateRenameLoop() {
    if (settingsState.renameDropdownEnabled && (settingsState.renameCommunitiesToGroups || settingsState.renameExperiencesToGames || settingsState.renameMarketplaceToAvatarShop)) {
      if (renameIntervalId === null) {
        setRenameIntervalId(window.setInterval(() => {
          applyCommunityRename(document.body);
          applyExperiencesRename(document.body);
          applyMarketplaceRename(document.body);
        }, 1500));
      }
      return;
    }
    if (renameIntervalId !== null) {
      window.clearInterval(renameIntervalId);
      setRenameIntervalId(null);
    }
  }

  // src/content/oldNavigationBar.js
  var HOST_ID = "roprime-classic-left-nav-host";
  var COLLAPSED_CLASS = "roprime-old-navigation-bar-collapsed";
  function stripLegacyInjections() {
    document.getElementById("roprime-left-gray-frame")?.remove();
    document.getElementById("roprime-left-gray-frame-layout-style")?.remove();
    document.documentElement.classList.remove("roprime-left-gray-frame-on");
    document.getElementById("roprime-old-navbar-style")?.remove();
    document.getElementById("roprime-old-navbar-host")?.remove();
    document.documentElement.classList.remove("roprime-old-navbar-active", "roprime-old-navbar-rail-expanded", "roprime-old-navbar-menu-open");
    const slot = document.getElementById("roprime-nav-menu-slot");
    if (slot) {
      const native = slot.querySelector("button.menu-button.btn-navigation-nav-menu-md");
      const parent = slot.parentElement;
      if (native instanceof HTMLButtonElement && parent) {
        native.classList.remove("roprime-native-nav-menu-hidden");
        parent.insertBefore(native, slot);
      }
      slot.remove();
    }
    document.querySelectorAll("button.roprime-native-nav-menu-hidden").forEach((b) => b.classList.remove("roprime-native-nav-menu-hidden"));
    document.getElementById("roprime-custom-nav-menu-btn")?.remove();
  }
  function shouldMountOldNavigationBar() {
    if (!document.body)
      return false;
    const path = window.location.pathname || "";
    if (/\/login\b/i.test(path) || /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?newlogin\b/i.test(path))
      return false;
    return true;
  }
  function scrapeProfile() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav)
      return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };
    let profileLink = null;
    for (const a of nav.querySelectorAll("a[href]")) {
      if (!(a instanceof HTMLAnchorElement))
        continue;
      const pathOnly = (a.getAttribute("href") || "").replace(/^https?:\/\/[^/]+/i, "");
      if (!/\/users\/\d+/i.test(pathOnly) && !/\/my\/account\b/i.test(pathOnly))
        continue;
      if (!a.querySelector("img"))
        continue;
      profileLink = a;
      break;
    }
    if (!profileLink)
      return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };
    const img = profileLink.querySelector("img");
    const avatar = img instanceof HTMLImageElement ? img.src || "" : "";
    let name = "Profile";
    const nameSpan = profileLink.querySelector("span[class*='font-body'], span[class*='text-'], span.text-truncate-end, p[class*='text-']");
    if (nameSpan?.textContent?.trim())
      name = nameSpan.textContent.trim();
    const href = profileLink.getAttribute("href") || "/my/account";
    const abs = /^https?:/i.test(href) ? href : `${window.location.origin}${href.startsWith("/") ? "" : "/"}${href}`;
    return { href: abs, avatar, name };
  }
  function scrapeMessagesBadge() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav)
      return null;
    const link = nav.querySelector('a[href*="/messages" i]');
    if (!(link instanceof HTMLAnchorElement))
      return null;
    const badgeLike = link.querySelector("[class*='badge' i], [class*='Badge'], [class*='notification' i], [data-testid*='badge' i]");
    if (badgeLike?.textContent) {
      const n = badgeLike.textContent.replace(/\D/g, "");
      if (n)
        return n.length > 3 ? "99+" : n;
    }
    for (const el of link.querySelectorAll("span, div")) {
      const t = el.textContent?.trim() || "";
      if (/^\d{1,3}$/.test(t))
        return t;
    }
    const label = link.getAttribute("aria-label") || "";
    const m = label.match(/(\d+)\s*(unread|new)?/i);
    if (m)
      return m[1];
    return null;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }
  function bindNativeMenuButtonToggle() {
    const root = document.documentElement;
    if (!root || root.getAttribute("data-roprime-old-nav-menu-bound") === "1")
      return;
    root.setAttribute("data-roprime-old-nav-menu-bound", "1");
    const handler = (event) => {
      const target = event.target;
      if (!(target instanceof Element))
        return;
      const btn = target.closest("button.menu-button.btn-navigation-nav-menu-md");
      if (!btn)
        return;
      root.classList.toggle(COLLAPSED_CLASS);
    };
    document.addEventListener("click", handler, true);
  }
  var ICON = {
    home: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`,
    user: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/></svg>`,
    message: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 10h8"/><path d="M8 13h5"/></svg>`,
    connect: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a4 4 0 0 1 4-4h2"/><path d="M17 11.5A4 4 0 0 1 21 15v1"/></svg>`,
    avatar: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="19.5" rx="5" ry="1.75"/><circle cx="12" cy="8.5" r="3.25"/><path d="M7.5 18.5v-.5a4.5 4.5 0 0 1 9 0v.5"/></svg>`,
    inventory: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16"/></svg>`,
    trade: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l5 5"/><path d="M5 5v5h5"/><path d="M19 19l-5-5"/><path d="M19 19v-5h-5"/></svg>`,
    communities: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="2.5"/><circle cx="15" cy="7" r="2"/><circle cx="17" cy="13" r="2"/><path d="M3 20v-1a3 3 0 0 1 3-3h1"/><path d="M21 20v-1a3 3 0 0 0-3-3h-1"/><path d="M12 11c-1.5 0-3 1-3 3v2h6v-2c0-2-1.5-3-3-3z"/></svg>`,
    blog: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>`,
    store: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 5h2l1 12a2 2 0 0 0 2 1.5h9a2 2 0 0 0 2-1.5L21 9H7"/><path d="M16 5l-2-2h-4"/></svg>`,
    gift: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V20"/><path d="M3 12h18"/><path d="M12 8a3 3 0 0 0 3-3c0 1.5-1.5 2-3 2S9 6.5 9 5a3 3 0 0 0 3 3z"/></svg>`
  };
  var ORIGIN = () => window.location.origin;
  var PRIMARY_LINKS = [
    { label: "Home", path: "/home", icon: "home" },
    { label: "Profile", path: "/my/account", icon: "user" },
    { label: "Messages", path: "/messages", icon: "message" },
    { label: "Connect", path: "/friends", icon: "connect" },
    { label: "Avatar", path: "/my/avatar", icon: "avatar" },
    { label: "Inventory", path: "/my/inventory", icon: "inventory" },
    { label: "Trade", path: "/trade", icon: "trade" },
    { label: "Communities", path: "/groups", icon: "communities" },
    { label: "Blog", path: "https://blog.roblox.com/", icon: "blog", newTab: true, extIcon: true },
    { label: "Official Store", path: "/catalog", icon: "store", extIcon: true },
    { label: "Buy Gift Cards", path: "/upgrades/giftcards", icon: "gift", extIcon: true }
  ];
  function linkRow(item, messagesBadge) {
    const isAbsolute = /^https?:/i.test(item.path);
    const href = isAbsolute ? item.path : `${ORIGIN()}${item.path}`;
    const target = item.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    let cls = "roprime-cln-link";
    if (item.extIcon)
      cls += " roprime-cln-link--ext-icon";
    if (item.newTab)
      cls += " roprime-cln-link--new-tab";
    const wrapCls = item.extIcon ? "roprime-cln-icon-wrap roprime-cln-icon-wrap--external" : "roprime-cln-icon-wrap";
    const icon = ICON[item.icon] || ICON.home;
    let tail = "";
    if (item.path === "/messages" && messagesBadge) {
      tail = `<span class="roprime-cln-badge" aria-label="${esc(messagesBadge)} unread">${esc(messagesBadge)}</span>`;
    }
    return `<li><a class="${cls}" href="${esc(href)}"${target}><span class="${wrapCls}">${icon}</span><span class="roprime-cln-label">${esc(item.label)}</span>${tail}</a></li>`;
  }
  function buildNavHtml(profileHref, avatarUrl, displayName) {
    const links = PRIMARY_LINKS.map((item) => item.path === "/groups" ? { ...item, label: settingsState.renameCommunitiesToGroups ? "Groups" : "Communities" } : item);
    const badge = scrapeMessagesBadge();
    const primary = links.map((item) => linkRow(item, badge)).join("");
    const avatar = avatarUrl ? `<img class="roprime-cln-avatar" src="${esc(avatarUrl)}" alt="" width="36" height="36" />` : `<span class="roprime-cln-avatar roprime-cln-avatar--ph" aria-hidden="true"></span>`;
    return `
<nav class="roprime-classic-left-nav" aria-label="RoPrime navigation">
  <header class="roprime-cln-top">
    <a class="roprime-cln-profile" href="${esc(profileHref)}">
      ${avatar}
      <span class="roprime-cln-name">${esc(displayName)}</span>
    </a>
    <div class="roprime-cln-divider" role="separator"></div>
  </header>
  <div class="roprime-cln-scroll">
    <ul class="roprime-cln-list">${primary}</ul>
    <a class="roprime-cln-premium" href="${esc(`${ORIGIN()}/premium/membership`)}">Get Premium</a>
  </div>
</nav>`.trim();
  }
  function renderInto(host) {
    const { href, avatar, name } = scrapeProfile();
    host.innerHTML = buildNavHtml(href, avatar, name);
  }
  function syncOldNavigationBar() {
    stripLegacyInjections();
    const root = document.documentElement;
    root.classList.remove("roprime-classic-left-nav-on");
    if (!settingsState.oldNavigationBarEnabled) {
      document.getElementById(HOST_ID)?.remove();
      root.classList.remove(COLLAPSED_CLASS);
      try {
        delete window.__oldRobloxOldNavigationBar;
      } catch {}
      return;
    }
    if (!shouldMountOldNavigationBar()) {
      document.getElementById(HOST_ID)?.remove();
      root.classList.remove(COLLAPSED_CLASS);
      return;
    }
    root.classList.add("roprime-classic-left-nav-on");
    bindNativeMenuButtonToggle();
    let host = document.getElementById(HOST_ID);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.className = "roprime-classic-left-nav-host";
      host.setAttribute("data-roelite", "old-navigation-bar");
      (document.body || document.documentElement).appendChild(host);
    }
    renderInto(host);
    try {
      window.__oldRobloxOldNavigationBar = host;
    } catch {}
    if (!host.dataset.rpConsoleLogged) {
      host.dataset.rpConsoleLogged = "1";
      console.log("[RoPrime] Old Navigation bar:", host, "| window.__oldRobloxOldNavigationBar");
    }
  }

  // src/content/friendStylingReimagned.js
  var FRIEND_STYLING_REIMAGNED_CSS = `
.friend-carousel-container {
    margin-bottom: 18px !important;
    overflow: visible !important;
    border-radius: 16px !important;
    background: linear-gradient(to bottom, #393b41 0%, #2f3136 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26) !important;
}

.friend-carousel-container .react-friends-carousel-container {
    padding: 12px 12px 10px 12px !important;
}

.friend-carousel-container .friends-carousel-container,
.friend-carousel-container .friends-carousel-list-container-not-full,
.friend-carousel-container .friends-carousel-list-container {
    overflow: visible !important;
    position: relative !important;
}

.friend-carousel-container .container-header.people-list-header {
    margin-bottom: 8px !important;
}

.friend-carousel-container .container-header.people-list-header h2 {
    margin: 0 !important;
}

.friend-carousel-container .avatar-card-image {
    position: relative !important;
    border-radius: 9999px !important;
    overflow: visible !important;
}

.friend-carousel-container .avatar-card-image::before {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: 9999px;
    background: linear-gradient(to bottom, #edf0f4 0%, #c9ced6 58%, #8c929d 100%);
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 8px rgba(219, 227, 240, 0.18);
    z-index: 0;
}

.friend-carousel-container .avatar-card-image::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: #070b10;
    z-index: 1;
}

.friend-carousel-container .avatar-card-image img {
    position: relative !important;
    border-radius: 9999px !important;
    z-index: 2 !important;
}

.friend-carousel-container .online .icon-online,
.friend-carousel-container .icon-online {
    position: relative !important;
    z-index: 4 !important;
}

.friend-carousel-container .game .icon-game,
.friend-carousel-container .icon-game {
    position: relative !important;
    z-index: 4 !important;
}
.friend-carousel-container .studio .icon-studio,
.friend-carousel-container .icon-studio {
    position: relative !important;
    z-index: 4 !important;
}

.friend-carousel-container .rologic-presence-offline .avatar-card-image::before {
    background: linear-gradient(to bottom, #edf0f4 0%, #c9ced6 58%, #8c929d 100%) !important;
    box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 8px rgba(219, 227, 240, 0.18) !important;
}

.friend-carousel-container .rologic-presence-online .avatar-card-image::before {
    background: linear-gradient(to bottom, #90dcff 0%, #4ab3ff 55%, #245dff 100%) !important;
    box-shadow:
        0 0 0 1px rgba(102, 189, 255, 0.52),
        0 0 10px rgba(74, 179, 255, 0.5),
        0 0 22px rgba(36, 93, 255, 0.42) !important;
}

.friend-carousel-container .rologic-presence-game .avatar-card-image::before {
    background: linear-gradient(to bottom, #a2ffbf 0%, #49ee7d 55%, #179a3f 100%) !important;
    box-shadow:
        0 0 0 1px rgba(73, 238, 125, 0.52),
        0 0 10px rgba(73, 238, 125, 0.46),
        0 0 22px rgba(23, 154, 63, 0.36) !important;
}

.friend-carousel-container .rologic-presence-studio .avatar-card-image::before {
    background: linear-gradient(to bottom, #ffd89d 0%, #ffaf4f 55%, #df7419 100%) !important;
    box-shadow:
        0 0 0 1px rgba(255, 175, 79, 0.5),
        0 0 10px rgba(255, 175, 79, 0.45),
        0 0 22px rgba(223, 116, 25, 0.36) !important;
}
`.trim();
  var GLOW_TILE_SELECTOR = ".friends-carousel-tile";
  var FRIEND_CAROUSEL_SELECTOR = ".friend-carousel-container";
  var GLOW_PRESENCE_CLASSES = [
    "rologic-presence-offline",
    "rologic-presence-online",
    "rologic-presence-game",
    "rologic-presence-studio"
  ];
  var friendStylingObserver = null;
  var friendStylingRafId = null;
  function getPresenceClass(tile) {
    const presenceIcon = tile.querySelector('[data-testid="presence-icon"]');
    if (!(presenceIcon instanceof HTMLElement))
      return "rologic-presence-offline";
    const presenceText = [presenceIcon.getAttribute("class"), presenceIcon.getAttribute("title"), presenceIcon.ariaLabel].filter(Boolean).join(" ").toLowerCase();
    if (presenceText.includes("studio"))
      return "rologic-presence-studio";
    if (presenceText.includes("game") || presenceText.includes("playing"))
      return "rologic-presence-game";
    if (presenceText.includes("online"))
      return "rologic-presence-online";
    return "rologic-presence-offline";
  }
  function applyFriendPresenceClasses() {
    document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
      if (!(tile instanceof HTMLElement))
        return;
      const nextPresenceClass = getPresenceClass(tile);
      if (tile.dataset.rpPresenceClass === nextPresenceClass)
        return;
      tile.classList.remove(...GLOW_PRESENCE_CLASSES);
      tile.classList.add(nextPresenceClass);
      tile.dataset.rpPresenceClass = nextPresenceClass;
    });
  }
  function scheduleFriendPresenceRefresh() {
    if (friendStylingRafId !== null)
      return;
    friendStylingRafId = window.requestAnimationFrame(() => {
      friendStylingRafId = null;
      if (!settingsState.friendStylingReimagnedEnabled)
        return;
      applyFriendPresenceClasses();
    });
  }
  function startFriendStylingObserver() {
    if (friendStylingObserver instanceof MutationObserver)
      return;
    if (!(document.body instanceof HTMLBodyElement))
      return;
    friendStylingObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!(mutation.target instanceof Element))
          continue;
        if (mutation.target.closest(FRIEND_CAROUSEL_SELECTOR) || Array.from(mutation.addedNodes).some((node) => node instanceof Element && (node.matches(FRIEND_CAROUSEL_SELECTOR) || !!node.querySelector(GLOW_TILE_SELECTOR)))) {
          scheduleFriendPresenceRefresh();
          return;
        }
      }
    });
    friendStylingObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "title", "aria-label"]
    });
  }
  function stopFriendStylingObserver() {
    if (friendStylingObserver instanceof MutationObserver) {
      friendStylingObserver.disconnect();
      friendStylingObserver = null;
    }
    if (friendStylingRafId !== null) {
      window.cancelAnimationFrame(friendStylingRafId);
      friendStylingRafId = null;
    }
  }
  function updateFriendStylingReimagnedVisibility() {
    const existingStyle = document.getElementById(RP_FRIEND_STYLING_REIMAGNED_STYLE_ID);
    if (!settingsState.friendStylingReimagnedEnabled) {
      stopFriendStylingObserver();
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      document.querySelectorAll(GLOW_TILE_SELECTOR).forEach((tile) => {
        if (!(tile instanceof HTMLElement))
          return;
        tile.classList.remove(...GLOW_PRESENCE_CLASSES);
        delete tile.dataset.rpPresenceClass;
      });
      return;
    }
    let style = existingStyle;
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = RP_FRIEND_STYLING_REIMAGNED_STYLE_ID;
      style.textContent = FRIEND_STYLING_REIMAGNED_CSS;
      document.documentElement.appendChild(style);
    }
    if (style.textContent !== FRIEND_STYLING_REIMAGNED_CSS)
      style.textContent = FRIEND_STYLING_REIMAGNED_CSS;
    if (style.parentElement !== document.documentElement)
      document.documentElement.appendChild(style);
    startFriendStylingObserver();
    scheduleFriendPresenceRefresh();
  }

  // src/content/welcome.js
  var RP_HOME_WELCOME_DISMISSED_KEY = "rpHomeWelcomeDismissed";
  var WELCOME_ROOT_ID = "roprime-home-welcome-root";
  var welcomeKeydownHandler = null;
  var storageDismissListenerAttached = false;
  function attachDismissStorageListener() {
    if (storageDismissListenerAttached)
      return;
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged)
      return;
    storageDismissListenerAttached = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local")
        return;
      if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true)
        removeWelcomeIfPresent();
    });
  }
  function isRobloxHomePage() {
    const raw = window.location.pathname || "/";
    const p = raw.replace(/\/+$/, "") || "/";
    if (p === "/home")
      return true;
    const parts = p.split("/").filter(Boolean);
    return parts.length >= 1 && parts[parts.length - 1].toLowerCase() === "home";
  }
  function removeWelcomeIfPresent() {
    if (welcomeKeydownHandler) {
      document.removeEventListener("keydown", welcomeKeydownHandler, true);
      welcomeKeydownHandler = null;
    }
    document.getElementById(WELCOME_ROOT_ID)?.remove();
  }
  function getExtensionIconUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL("resources/roprime-icon.png");
    }
    return "";
  }
  function appendWelcomeWhenBodyReady(root) {
    const mount = () => {
      const parent = document.body;
      if (parent) {
        parent.appendChild(root);
        return true;
      }
      return false;
    };
    if (mount())
      return;
    const tryMount = () => {
      if (!isRobloxHomePage()) {
        mo.disconnect();
        document.removeEventListener("DOMContentLoaded", onDomReady);
        return;
      }
      if (mount()) {
        mo.disconnect();
        document.removeEventListener("DOMContentLoaded", onDomReady);
      }
    };
    const mo = new MutationObserver(() => tryMount());
    mo.observe(document.documentElement, { childList: true });
    function onDomReady() {
      tryMount();
    }
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
    window.setTimeout(() => {
      mo.disconnect();
      document.removeEventListener("DOMContentLoaded", onDomReady);
      if (!isRobloxHomePage())
        return;
      if (root.parentElement)
        return;
      (document.body || document.documentElement).appendChild(root);
    }, 8000);
  }
  function showWelcomeModal() {
    if (document.getElementById(WELCOME_ROOT_ID))
      return;
    const root = document.createElement("div");
    root.id = WELCOME_ROOT_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "roprime-welcome-title");
    const iconSrc = getExtensionIconUrl();
    root.innerHTML = `
        <div class="roprime-welcome-backdrop" data-roprime-welcome-dismiss="backdrop"></div>
        <div class="roprime-welcome-frame">
            <div class="roprime-welcome-card">
                <img class="roprime-welcome-logo" src="${iconSrc}" alt="" width="80" height="80" />
                <h2 id="roprime-welcome-title" class="roprime-welcome-title">RoPrime is installed</h2>
                <p class="roprime-welcome-text">You can change the look of RoPrime anytime from your Settings by clicking <strong>RoPrime Settings</strong>.</p>
                <button type="button" class="roprime-welcome-ok">Okay</button>
            </div>
        </div>
    `;
    const dismiss = () => {
      const storage = getStorageApi();
      if (storage) {
        storage.set({ [RP_HOME_WELCOME_DISMISSED_KEY]: true });
      }
      removeWelcomeIfPresent();
    };
    root.querySelector(".roprime-welcome-ok")?.addEventListener("click", dismiss);
    root.querySelector("[data-roprime-welcome-dismiss='backdrop']")?.addEventListener("click", dismiss);
    welcomeKeydownHandler = (e) => {
      if (e.key === "Escape")
        dismiss();
    };
    document.addEventListener("keydown", welcomeKeydownHandler, true);
    appendWelcomeWhenBodyReady(root);
  }
  function syncHomeWelcomeModal() {
    attachDismissStorageListener();
    if (!isRobloxHomePage()) {
      removeWelcomeIfPresent();
      return;
    }
    const storage = getStorageApi();
    if (!storage) {
      showWelcomeModal();
      return;
    }
    storage.get([RP_HOME_WELCOME_DISMISSED_KEY], (result) => {
      if (chrome.runtime?.lastError) {
        if (!isRobloxHomePage())
          return;
        showWelcomeModal();
        return;
      }
      if (!isRobloxHomePage())
        return;
      const dismissed = result?.[RP_HOME_WELCOME_DISMISSED_KEY];
      if (dismissed === true) {
        removeWelcomeIfPresent();
        return;
      }
      showWelcomeModal();
    });
  }

  // src/content/accountTab.js
  function getRobloxAccountMenu() {
    const root = document.getElementById("react-user-account-base");
    if (!(root instanceof HTMLElement))
      return null;
    const menus = Array.from(root.querySelectorAll(".menu-vertical"));
    const menu = menus.find((m) => m.querySelector('.menu-option a[href*="browser-preferences"], .menu-option a[href*="browserpreferences"]'));
    return menu instanceof HTMLElement ? menu : null;
  }
  function injectRoEliteTab(onNavigate) {
    if (!isAccountPage())
      return;
    const menu = getRobloxAccountMenu();
    if (!menu || document.getElementById(RP_TAB_ID))
      return;
    const iconUrl = typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function" ? chrome.runtime.getURL("resources/roprime-icon.png") : "resources/roprime-icon.png";
    const li = document.createElement("li");
    li.id = RP_TAB_ID;
    li.className = "menu-option";
    li.setAttribute("role", "tab");
    li.innerHTML = `<a class="menu-option-content" href="#"><img class="roprime-menu-icon" src="${iconUrl}" alt="" width="15" height="15" /><span class="menu-text">RoPrime Settings</span></a>`;
    li.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      const nextUrl = buildPluginUrl(RP_DEFAULT_PAGE);
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl !== nextUrl)
        window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
      if (typeof onNavigate === "function")
        onNavigate();
    }, true);
    const insertAfter = menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") || menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") || null;
    if (insertAfter instanceof HTMLElement)
      insertAfter.insertAdjacentElement("afterend", li);
    else
      menu.appendChild(li);
  }
  function ensureAccountDivider() {
    if (!isAccountPage())
      return;
    const menu = getRobloxAccountMenu();
    if (!(menu instanceof HTMLElement))
      return;
    const oldRobloxTab = document.getElementById(RP_TAB_ID);
    if (!(oldRobloxTab instanceof HTMLElement))
      return;
    const existingDividers = Array.from(menu.querySelectorAll(".roprime-divider"));
    const divider = existingDividers[0] instanceof HTMLElement ? existingDividers[0] : null;
    existingDividers.slice(1).forEach((el) => el.remove());
    const browserPreferencesItem = menu.querySelector('.menu-option a[href*="browser-preferences"]')?.closest(".menu-option") || menu.querySelector('.menu-option a[href*="browserpreferences"]')?.closest(".menu-option") || null;
    const desiredAnchor = browserPreferencesItem instanceof HTMLElement ? browserPreferencesItem : oldRobloxTab;
    const desiredPosition = desiredAnchor === oldRobloxTab ? "beforebegin" : "afterend";
    const activeDivider = divider || (() => {
      const el = document.createElement("li");
      el.className = "rbx-divider thick-height";
      el.classList.add("roprime-divider");
      return el;
    })();
    const currentAnchor = activeDivider.previousElementSibling === desiredAnchor || activeDivider.nextElementSibling === desiredAnchor ? desiredAnchor : null;
    if (!currentAnchor)
      desiredAnchor.insertAdjacentElement(desiredPosition, activeDivider);
  }

  // src/content/smallNewNav.js
  function updateSmallNewNavVisibility() {
    const existingStyle = document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID);
    if (!settingsState.smallNewNavigationBarEnabled) {
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      return;
    }
    if (existingStyle instanceof HTMLStyleElement)
      return;
    const style = document.createElement("style");
    style.id = RP_SMALL_NEW_NAV_STYLE_ID;
    style.textContent = [
      '.width-\\[288px\\], .width-\\[289px\\], [class~="width-[288px]"], [class~="width-[289px]"] { width: 200px !important; min-width: 0 !important; max-width: 200px !important; }'
    ].join(`
`);
    document.documentElement.appendChild(style);
  }

  // src/content/sidebarCompact.js
  var RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS = "roprime-leftnav-official-store";
  var RP_LEFTNAV_PROFILE_LI_CLASS = "roprime-leftnav-profile";
  var RP_SIDEBAR_PLUS_ITEM_ID = "roprime-sidebar-plus-item";
  var RP_SIDEBAR_PLUS_BTN_CLASS = "roprime-sidebar-plus-btn";
  var RP_SIDEBAR_PLUS_ICON_CLASS = "roprime-sidebar-plus-icon";
  var RP_RBLX_PLUS_LOGO_URL = typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function" ? chrome.runtime.getURL("resources/RblxPlusLogo.webp") : "resources/RblxPlusLogo.webp";
  var ROBLOX_LOCALE_SEGMENT_REGEX = /^[a-z]{2}(?:-[a-z]{2})?$/i;
  var SIDEBAR_COMPACT_RAIL_PX = 72;
  var SIDEBAR_COMPACT_ICON_PX = 48;
  var SIDEBAR_COMPACT_CSS = `
body .no-gutter-ads.logged-in.left-nav-new-width {
  --left-nav-reserved-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
}
.left-nav.fixed {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
  overflow-x: clip !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.left-nav.fixed::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
.left-nav.fixed .stroke-default.self-stretch,
.left-nav.fixed [class*="stroke-default"][class*="self-stretch"] {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: auto !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: none !important;
  flex-shrink: 0 !important;
  align-self: stretch !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  z-index: 40 !important;
  pointer-events: none !important;
  box-sizing: border-box !important;
  border: none !important;
  border-right: 1px solid var(--stroke-default, rgba(255, 255, 255, 0.16)) !important;
  background-color: transparent !important;
  background-image: none !important;
  overflow: visible !important;
}
.left-nav.fixed .simplebar-wrapper,
.left-nav.fixed .simplebar-mask,
.left-nav.fixed .simplebar-offset,
.left-nav.fixed .simplebar-content-wrapper,
.left-nav.fixed .simplebar-content {
  box-sizing: border-box !important;
  min-width: 0 !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  overflow-x: clip !important;
}
.left-nav.fixed .simplebar-content-wrapper {
  overflow-y: auto !important;
}
.left-nav.fixed .simplebar-track.simplebar-horizontal,
.left-nav.fixed .simplebar-scrollbar.simplebar-horizontal {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  min-height: 0 !important;
}
.left-nav.fixed.width-\\[288px\\],
.left-nav.fixed.width-\\[289px\\],
.left-nav.fixed .width-\\[288px\\],
.left-nav.fixed .width-\\[289px\\],
.left-nav.fixed [class~="width-[288px]"],
.left-nav.fixed [class~="width-[289px]"] {
  width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_RAIL_PX}px !important;
  box-sizing: border-box !important;
}
.left-nav.fixed .width-\\[288px\\] {
  width: 100% !important;
  max-width: 250px !important; /* Limits size but allows it to shrink */
}
.left-nav.fixed .width-\\[288px\\] {
  overflow-x: hidden !important;
}
.left-nav.fixed ul,
.left-nav.fixed ol {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed div:has(> li) {
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  align-items: center !important;
}
.left-nav.fixed li {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: auto !important;
  align-self: center !important;
  overflow: hidden !important;
}
.left-nav.fixed a[href] .truncate,
.left-nav.fixed a[href] [class*="line-clamp"],
.left-nav.fixed a[href] [class*="line-clamp-"],
.left-nav.fixed a[href] > span[class*="text-"]:not([class*="badge"]):not([class*="Badge"]),
.left-nav.fixed a[href] span[class*="font-body"],
.left-nav.fixed a[href] p[class*="text-"] {
  display: none !important;
}
.left-nav.fixed span.text-truncate-end.text-no-wrap,
.left-nav.fixed span[class*="text-truncate-end"][class*="text-no-wrap"] {
  display: none !important;
}
.left-nav.fixed span.flex.gap-xsmall.min-width-0.align-items-center,
.left-nav.fixed span.flex.gap-xsmall.min-width-0.items-center,
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="align-items-center"],
.left-nav.fixed span[class*="gap-xsmall"][class*="min-width-0"][class*="items-center"] {
  display: none !important;
}
.left-nav.fixed a[href] {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
}
.left-nav.fixed a[href] svg,
.left-nav.fixed a[href] img {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li:has(a[href*="premium" i]),
.left-nav.fixed a[href*="/premium" i],
.left-nav.fixed a[href*="premium" i],
.left-nav.fixed button[aria-label*="Premium" i],
.left-nav.fixed button[aria-label*="Get Premium" i],
.left-nav.fixed li:has(a[aria-label*="Official Store" i]),
.left-nav.fixed a[aria-label*="Official Store" i],
.left-nav.fixed a[title*="Official Store" i],
.left-nav.fixed a[href*="/sponsored" i],
.left-nav.fixed li:has(a[href*="/sponsored" i]) {
  display: none !important;
}
.left-nav.fixed li:has(button[aria-label*="Premium" i]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 ~ span,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span:not([class]) {
  display: none !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  flex-shrink: 0 !important;
  position: relative !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div.absolute,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > div[class*="inset-"] {
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  inset: 0 !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} > span.size-1000 {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  flex: 0 0 ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 0 !important;
}
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} svg,
.left-nav.fixed button.${RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS} .icon-regular-building-store {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
}
.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS} a[href] {
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  overflow: hidden !important;
}
.left-nav.fixed li#${RP_SIDEBAR_PLUS_ITEM_ID} {
  margin-top: auto !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  box-sizing: border-box !important;
  width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-width: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  min-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  max-height: ${SIDEBAR_COMPACT_ICON_PX}px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: #3a3d43 !important;
  cursor: pointer !important;
  overflow: hidden !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS}:hover {
  filter: brightness(1.06) !important;
}
.left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} .${RP_SIDEBAR_PLUS_ICON_CLASS} {
  width: 26px !important;
  height: 26px !important;
  max-width: 26px !important;
  max-height: 26px !important;
  object-fit: contain !important;
}
html.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.light-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #e2e6ea !important;
  border-color: rgba(39, 43, 50, 0.16) !important;
}
html.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS},
body.dark-theme .left-nav.fixed button.${RP_SIDEBAR_PLUS_BTN_CLASS} {
  background: #3a3d43 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
.left-nav.fixed li:has(a[href*="/messages" i]) {
  overflow: visible !important;
  position: relative !important;
  z-index: 80 !important;
}
.left-nav.fixed a[href*="/messages" i],
.left-nav.fixed a[href*="/messages" i]:hover,
.left-nav.fixed a[href*="/messages" i]:focus-visible,
.left-nav.fixed a[href*="/messages" i]:active {
  position: relative !important;
  overflow: visible !important;
  z-index: 1 !important;
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > div,
.left-nav.fixed a[href*="/messages" i] > div.absolute,
.left-nav.fixed a[href*="/messages" i] > div[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] > span[class*="absolute"],
.left-nav.fixed a[href*="/messages" i] > span[class*="inset-"],
.left-nav.fixed a[href*="/messages" i] [class*="inset-"][class*="absolute"],
.left-nav.fixed a[href*="/messages" i]::before,
.left-nav.fixed a[href*="/messages" i]::after {
  border-radius: var(--radius-medium, 10px) !important;
}
.left-nav.fixed a[href*="/messages" i] > span.grow-0.shrink-0.basis-auto.icon.icon-regular-speech-bubble-align-center,
.left-nav.fixed a[href*="/messages" i] span.icon-regular-speech-bubble-align-center {
  position: relative !important;
  z-index: 1 !important;
}
.left-nav.fixed a[href*="/messages" i] span.fill.basis-auto.padding-x-small.flex.justify-end.items-center,
.left-nav.fixed a[href*="/messages" i] span.fill[class*="basis-auto"][class*="padding-x-small"][class*="justify-end"][class*="items-center"],
.left-nav.fixed a[href*="/messages" i] .foundation-web-badge,
.left-nav.fixed a[href*="/messages" i] [class*="foundation-web-badge"] {
  position: absolute !important;
  top: 4px !important;
  right: 4px !important;
  left: auto !important;
  bottom: auto !important;
  margin: 0 !important;
  z-index: 250 !important;
  transform: scale(0.9) !important;
  transform-origin: top right !important;
  pointer-events: none !important;
}
`.trim();
  function tagOfficialStoreLeftNavButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement))
      return;
    const icon = nav.querySelector("button .icon-regular-building-store");
    const btn = icon instanceof Element ? icon.closest("button") : null;
    if (!(btn instanceof HTMLButtonElement))
      return;
    if (settingsState.sidebarIconsOnlyEnabled)
      btn.classList.add(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
    else
      btn.classList.remove(RP_LEFTNAV_OFFICIAL_STORE_BTN_CLASS);
  }
  function tagProfileLeftNavItem() {
    const clearProfileClass = () => {
      document.querySelectorAll(`.left-nav.fixed li.${RP_LEFTNAV_PROFILE_LI_CLASS}`).forEach((el) => {
        el.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
      });
    };
    if (!settingsState.sidebarIconsOnlyEnabled) {
      clearProfileClass();
      return;
    }
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement)) {
      clearProfileClass();
      return;
    }
    let matched = null;
    for (const li of nav.querySelectorAll("li")) {
      const a = li.querySelector("a[href]");
      if (!(a instanceof HTMLAnchorElement))
        continue;
      const href = a.getAttribute("href") || "";
      const pathOnly = href.replace(/^https?:\/\/[^/]+/i, "");
      const looksLikeProfile = /\/users\/\d+/i.test(pathOnly) || /\/my\/account\b/i.test(pathOnly) || /\/my\/profile\b/i.test(pathOnly);
      if (!looksLikeProfile)
        continue;
      if (!a.querySelector("img"))
        continue;
      matched = li;
      break;
    }
    for (const li of nav.querySelectorAll("li")) {
      if (li === matched)
        li.classList.add(RP_LEFTNAV_PROFILE_LI_CLASS);
      else
        li.classList.remove(RP_LEFTNAV_PROFILE_LI_CLASS);
    }
  }
  function getPremiumMembershipUrl() {
    const origin = window.location.origin || "https://www.roblox.com";
    const pathParts = (window.location.pathname || "/").split("/").filter(Boolean);
    const localeSegment = pathParts[0];
    const localizedPath = localeSegment && ROBLOX_LOCALE_SEGMENT_REGEX.test(localeSegment) ? `/${localeSegment}/premium/membership` : "/premium/membership";
    return `${origin}${localizedPath}`;
  }
  function syncSidebarCompactBottomButton() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!(nav instanceof HTMLElement))
      return;
    const existing = nav.querySelector(`#${RP_SIDEBAR_PLUS_ITEM_ID}`);
    if (!settingsState.sidebarIconsOnlyEnabled) {
      if (existing instanceof HTMLElement)
        existing.remove();
      return;
    }
    const listCandidates = Array.from(nav.querySelectorAll("ul, ol")).filter((list) => list.querySelector("li"));
    const hostList = listCandidates[listCandidates.length - 1];
    if (!(hostList instanceof HTMLElement))
      return;
    let item = existing;
    if (!(item instanceof HTMLLIElement)) {
      item = document.createElement("li");
      item.id = RP_SIDEBAR_PLUS_ITEM_ID;
      const button = document.createElement("button");
      button.type = "button";
      button.className = RP_SIDEBAR_PLUS_BTN_CLASS;
      button.setAttribute("aria-label", "RblxPlus");
      button.addEventListener("click", () => {
        window.location.assign(getPremiumMembershipUrl());
      });
      const icon = document.createElement("img");
      icon.className = RP_SIDEBAR_PLUS_ICON_CLASS;
      icon.src = RP_RBLX_PLUS_LOGO_URL;
      icon.alt = "RblxPlus";
      button.appendChild(icon);
      item.appendChild(button);
    }
    if (item.parentElement !== hostList)
      hostList.appendChild(item);
  }
  function updateSidebarCompactVisibility() {
    const existingStyle = document.getElementById(RP_SIDEBAR_COMPACT_STYLE_ID);
    if (!settingsState.sidebarIconsOnlyEnabled) {
      if (existingStyle instanceof HTMLStyleElement)
        existingStyle.remove();
      return;
    }
    let style = existingStyle;
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = RP_SIDEBAR_COMPACT_STYLE_ID;
    }
    style.textContent = SIDEBAR_COMPACT_CSS;
    document.documentElement.appendChild(style);
  }
  function syncSidebarCompactDecorations() {
    tagOfficialStoreLeftNavButton();
    tagProfileLeftNavItem();
    syncSidebarCompactBottomButton();
  }

  // src/content/settingsPane.js
  function buildSettingsPaneMarkup() {
    return `
        <div class="${RP_PANEL_CLASS}">
            <div class="roprime-settings-hero"><h2>RoPrime Settings</h2><p>Make Roblox things feel right again.</p></div>
            <div class="roprime-settings-layout">
                <div class="roprime-settings-nav" role="tablist" aria-label="RoPrime Settings sections">
                    <button class="roprime-settings-nav-btn" data-roprime-page="design" type="button">Design</button>
                    <button class="roprime-settings-nav-btn" data-roprime-page="info" type="button">Info</button>
                </div>
                <div class="roprime-settings-main">
                    <section class="roprime-settings-section" data-roprime-section="design">
                        <div class="roprime-setting-card roprime-accordion" data-roprime-accordion="rename">
                            <div class="roprime-accordion-header" role="button" tabindex="0" aria-expanded="false">
                                <div class="roprime-setting-copy"><div class="roprime-setting-title">Rename Roblox wording</div></div>
                                <label class="roprime-switch roprime-accordion-master-switch" for="roprime-toggle-rename-master"><input id="roprime-toggle-rename-master" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label>
                                <span class="roprime-accordion-chevron" aria-hidden="true"></span>
                            </div>
                            <div class="roprime-accordion-body" hidden>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Communities → Groups</div></div><label class="roprime-switch" for="roprime-toggle-rename-communities"><input id="roprime-toggle-rename-communities" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Experiences → Games</div></div><label class="roprime-switch" for="roprime-toggle-rename-experiences"><input id="roprime-toggle-rename-experiences" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                                <div class="roprime-toggle-row"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Marketplace → Avatar Shop</div></div><label class="roprime-switch" for="roprime-toggle-rename-marketplace"><input id="roprime-toggle-rename-marketplace" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                            </div>
                        </div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Old Navigation bar</div><div class="roprime-toggle-desc">Adds a fixed classic-style left rail (logo, profile, links, Get Premium, Events). Roblox’s own sidebar is left as-is underneath.</div></div><label class="roprime-switch" for="roprime-toggle-old-navigation-bar"><input id="roprime-toggle-old-navigation-bar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Small new navigation bar</div><div class="roprime-toggle-desc">Narrows the new left nav column (overrides the default 288px width).</div></div><label class="roprime-switch" for="roprime-toggle-small-new-navbar"><input id="roprime-toggle-small-new-navbar" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Icon-only left sidebar</div><div class="roprime-toggle-desc">Compact rail (~72px), 48px icon targets, stacks above the page, no sidebar scrolling; hides labels, Get Premium, and Official Store.</div></div><label class="roprime-switch" for="roprime-toggle-sidebar-compact"><input id="roprime-toggle-sidebar-compact" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                        <div class="roprime-toggle-row roprime-setting-card-spaced"><div class="roprime-toggle-copy"><div class="roprime-toggle-title">Friend styling reimagned</div><div class="roprime-toggle-desc">Restyles the friends carousel with a dark glass card and animated presence ring glow.</div></div><label class="roprime-switch" for="roprime-toggle-friend-styling-reimagned"><input id="roprime-toggle-friend-styling-reimagned" type="checkbox" /><span class="roprime-switch-slider" aria-hidden="true"></span></label></div>
                    </section>
                    <section class="roprime-settings-section" data-roprime-section="info"><div class="roprime-info-card"><div class="roprime-info-title">RoPrime</div><div class="roprime-info-text">This extension adds an RoPrime settings panel on your Roblox Account page and can rename some modern Roblox wording back to classic terms.</div></div></section>
                </div>
            </div>
        </div>`;
  }
  function ensureStandaloneSettingsView() {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement))
      return null;
    let standalone = accountBase.querySelector(`#${RP_STANDALONE_ID}`);
    if (!standalone) {
      standalone = document.createElement("div");
      standalone.id = RP_STANDALONE_ID;
      standalone.innerHTML = buildSettingsPaneMarkup();
      accountBase.appendChild(standalone);
    } else {
      const legacyDescription = standalone.querySelector('[data-roprime-accordion="rename"] .roprime-setting-desc');
      const missingSmallNavToggle = !standalone.querySelector("#roprime-toggle-small-new-navbar");
      const missingSidebarCompactToggle = !standalone.querySelector("#roprime-toggle-sidebar-compact");
      const missingOldNavigationBarToggle = !standalone.querySelector("#roprime-toggle-old-navigation-bar");
      const missingFriendStylingReimagnedToggle = !standalone.querySelector("#roprime-toggle-friend-styling-reimagned");
      if (legacyDescription || missingSmallNavToggle || missingSidebarCompactToggle || missingOldNavigationBarToggle || missingFriendStylingReimagnedToggle) {
        standalone.innerHTML = buildSettingsPaneMarkup();
        standalone.removeAttribute("data-roprime-controls-bound");
        standalone.removeAttribute("data-roprime-design-toggles-bound");
      }
    }
    return standalone;
  }
  function updateStandaloneSettingsVisibility(showPanel) {
    const accountBase = document.getElementById("react-user-account-base");
    if (!(accountBase instanceof HTMLElement))
      return null;
    const elementsToToggle = [
      accountBase.querySelector(".tab-content.rbx-tab-content"),
      accountBase.querySelector(".tab-content"),
      accountBase.querySelector("#settings-container"),
      accountBase.querySelector("#mobile-navigation-dropdown")
    ];
    elementsToToggle.forEach((element) => {
      if (!(element instanceof HTMLElement))
        return;
      if (showPanel)
        element.style.display = "none";
      else
        element.style.display = "";
    });
    const standalone = ensureStandaloneSettingsView();
    if (!(standalone instanceof HTMLElement))
      return null;
    standalone.style.display = showPanel ? "block" : "none";
    return standalone;
  }
  function bindIndependentDesignToggles(pane, actions, onNavigate) {
    if (pane.getAttribute("data-roprime-design-toggles-bound") === "1")
      return;
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const smallNewNavToggle = pane.querySelector("#roprime-toggle-small-new-navbar");
    const sidebarCompactToggle = pane.querySelector("#roprime-toggle-sidebar-compact");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    if (oldNavigationBarToggle instanceof HTMLInputElement) {
      oldNavigationBarToggle.addEventListener("change", () => {
        settingsState.oldNavigationBarEnabled = oldNavigationBarToggle.checked;
        saveSettings();
        actions.updateOldNavigationBarVisibility();
      });
    }
    if (smallNewNavToggle instanceof HTMLInputElement) {
      smallNewNavToggle.addEventListener("change", () => {
        settingsState.smallNewNavigationBarEnabled = smallNewNavToggle.checked;
        saveSettings();
        actions.updateSmallNewNavVisibility();
      });
    }
    if (sidebarCompactToggle instanceof HTMLInputElement) {
      sidebarCompactToggle.addEventListener("change", () => {
        settingsState.sidebarIconsOnlyEnabled = sidebarCompactToggle.checked;
        saveSettings();
        actions.updateSidebarCompactVisibility();
      });
    }
    if (friendStylingReimagnedToggle instanceof HTMLInputElement) {
      friendStylingReimagnedToggle.addEventListener("change", () => {
        settingsState.friendStylingReimagnedEnabled = friendStylingReimagnedToggle.checked;
        saveSettings();
        actions.updateFriendStylingReimagnedVisibility();
      });
    }
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
      if (!(button instanceof HTMLButtonElement))
        return;
      button.addEventListener("click", () => {
        const nextPage = button.dataset.roprimePage || RP_DEFAULT_PAGE;
        const nextUrl = buildPluginUrl(nextPage);
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentUrl !== nextUrl)
          window.history.pushState({ oldRobloxSettings: true }, "", nextUrl);
        onNavigate();
      });
    });
    pane.setAttribute("data-roprime-design-toggles-bound", "1");
  }
  function bindSettingsControls(pane, actions, onNavigate) {
    bindIndependentDesignToggles(pane, actions, onNavigate);
    if (pane.getAttribute("data-roprime-controls-bound") === "1")
      return;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    const accordionHeader = accordion?.querySelector(".roprime-accordion-header");
    const accordionBody = accordion?.querySelector(".roprime-accordion-body");
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    if (!(accordion instanceof HTMLElement))
      return;
    if (!(accordionHeader instanceof HTMLElement))
      return;
    if (!(accordionBody instanceof HTMLElement))
      return;
    if (!(masterToggle instanceof HTMLInputElement))
      return;
    if (!(communitiesToggle instanceof HTMLInputElement))
      return;
    if (!(experiencesToggle instanceof HTMLInputElement))
      return;
    if (!(marketplaceToggle instanceof HTMLInputElement))
      return;
    const syncAccordionA11y = () => {
      const isOpen = accordion.classList.contains("is-open");
      accordionHeader.setAttribute("aria-expanded", String(isOpen));
      accordionBody.setAttribute("aria-hidden", String(!isOpen));
    };
    const animateAccordion = (open) => {
      const currentHeight = accordionBody.scrollHeight;
      accordionBody.style.maxHeight = `${currentHeight}px`;
      if (open) {
        accordion.classList.add("is-open");
        requestAnimationFrame(() => {
          accordionBody.style.maxHeight = `${accordionBody.scrollHeight}px`;
        });
      } else {
        requestAnimationFrame(() => {
          accordion.classList.remove("is-open");
          accordionBody.style.maxHeight = "0px";
        });
      }
      syncAccordionA11y();
    };
    const toggleAccordion = () => animateAccordion(!accordion.classList.contains("is-open"));
    const openAccordion = () => {
      if (!accordion.classList.contains("is-open"))
        animateAccordion(true);
    };
    const closeAccordion = () => {
      if (accordion.classList.contains("is-open"))
        animateAccordion(false);
    };
    masterToggle.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.addEventListener("click", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("pointerdown", (event) => event.stopPropagation());
    masterToggle.closest("label")?.addEventListener("click", (event) => event.stopPropagation());
    accordionHeader.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".roprime-accordion-master-switch"))
        return;
      toggleAccordion();
    });
    accordionHeader.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ")
        return;
      const target = event.target;
      if (target instanceof Element && target.closest(".roprime-accordion-master-switch"))
        return;
      event.preventDefault();
      toggleAccordion();
    });
    const applyRenameUiEnabledState = () => {
      const enabled = !!settingsState.renameDropdownEnabled;
      masterToggle.checked = enabled;
      communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
      experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
      marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
      accordion.classList.toggle("is-renames-disabled", !enabled);
    };
    masterToggle.addEventListener("change", () => {
      const enable = !!masterToggle.checked;
      settingsState.renameDropdownEnabled = enable;
      saveSettings();
      updateRenameLoop();
      applyRenameUiEnabledState();
      if (!enable) {
        closeAccordion();
        if (settingsState.renameCommunitiesToGroups)
          applyGroupsBackRename(document.body);
        if (settingsState.renameExperiencesToGames)
          applyGamesBackRename(document.body);
        if (settingsState.renameMarketplaceToAvatarShop)
          applyAvatarShopBackRename(document.body);
        return;
      }
      openAccordion();
      if (settingsState.renameCommunitiesToGroups)
        applyCommunityRename(document.body);
      if (settingsState.renameExperiencesToGames)
        applyExperiencesRename(document.body);
      if (settingsState.renameMarketplaceToAvatarShop)
        applyMarketplaceRename(document.body);
    });
    communitiesToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameCommunitiesToGroups;
      settingsState.renameCommunitiesToGroups = communitiesToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameCommunitiesToGroups) {
        applyCommunityRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyGroupsBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    experiencesToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameExperiencesToGames;
      settingsState.renameExperiencesToGames = experiencesToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameExperiencesToGames) {
        applyExperiencesRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyGamesBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    marketplaceToggle.addEventListener("change", () => {
      if (!settingsState.renameDropdownEnabled) {
        settingsState.renameDropdownEnabled = true;
        masterToggle.checked = true;
      }
      const wasEnabled = !!settingsState.renameMarketplaceToAvatarShop;
      settingsState.renameMarketplaceToAvatarShop = marketplaceToggle.checked;
      saveSettings();
      updateRenameLoop();
      if (settingsState.renameMarketplaceToAvatarShop) {
        applyMarketplaceRename(document.body);
        openAccordion();
      } else if (wasEnabled) {
        applyAvatarShopBackRename(document.body);
      }
      applyRenameUiEnabledState();
    });
    accordionBody.hidden = false;
    accordionBody.style.maxHeight = accordion.classList.contains("is-open") ? `${accordionBody.scrollHeight}px` : "0px";
    syncAccordionA11y();
    applyRenameUiEnabledState();
    pane.setAttribute("data-roprime-controls-bound", "1");
  }
  function refreshSettingsControls(pane) {
    const masterToggle = pane.querySelector("#roprime-toggle-rename-master");
    const communitiesToggle = pane.querySelector("#roprime-toggle-rename-communities");
    const experiencesToggle = pane.querySelector("#roprime-toggle-rename-experiences");
    const marketplaceToggle = pane.querySelector("#roprime-toggle-rename-marketplace");
    const oldNavigationBarToggle = pane.querySelector("#roprime-toggle-old-navigation-bar");
    const smallNewNavToggle = pane.querySelector("#roprime-toggle-small-new-navbar");
    const sidebarCompactToggle = pane.querySelector("#roprime-toggle-sidebar-compact");
    const friendStylingReimagnedToggle = pane.querySelector("#roprime-toggle-friend-styling-reimagned");
    if (masterToggle instanceof HTMLInputElement)
      masterToggle.checked = !!settingsState.renameDropdownEnabled;
    if (communitiesToggle instanceof HTMLInputElement)
      communitiesToggle.checked = !!settingsState.renameCommunitiesToGroups;
    if (experiencesToggle instanceof HTMLInputElement)
      experiencesToggle.checked = !!settingsState.renameExperiencesToGames;
    if (marketplaceToggle instanceof HTMLInputElement)
      marketplaceToggle.checked = !!settingsState.renameMarketplaceToAvatarShop;
    if (oldNavigationBarToggle instanceof HTMLInputElement)
      oldNavigationBarToggle.checked = !!settingsState.oldNavigationBarEnabled;
    if (smallNewNavToggle instanceof HTMLInputElement)
      smallNewNavToggle.checked = !!settingsState.smallNewNavigationBarEnabled;
    if (sidebarCompactToggle instanceof HTMLInputElement)
      sidebarCompactToggle.checked = !!settingsState.sidebarIconsOnlyEnabled;
    if (friendStylingReimagnedToggle instanceof HTMLInputElement)
      friendStylingReimagnedToggle.checked = !!settingsState.friendStylingReimagnedEnabled;
    const accordion = pane.querySelector('[data-roprime-accordion="rename"]');
    if (accordion instanceof HTMLElement) {
      accordion.classList.toggle("is-renames-disabled", !settingsState.renameDropdownEnabled);
    }
    const activePage = getCurrentrp() || RP_DEFAULT_PAGE;
    pane.querySelectorAll(".roprime-settings-nav-btn").forEach((button) => {
      if (!(button instanceof HTMLButtonElement))
        return;
      const isActive = button.dataset.roprimePage === activePage;
      button.classList.toggle("is-active", isActive);
    });
    pane.querySelectorAll(".roprime-settings-section").forEach((section) => {
      if (!(section instanceof HTMLElement))
        return;
      const sectionKey = section.getAttribute("data-roprime-section") || "";
      section.style.display = sectionKey === activePage ? "block" : "none";
    });
  }

  // src/content/pageChrome.js
  function updateTabState(showPanel, pluginTabId) {
    const pluginTab = document.getElementById(pluginTabId);
    if (!pluginTab)
      return;
    if (showPanel)
      pluginTab.classList.add("active");
    else
      pluginTab.classList.remove("active");
  }
  function updateSidebarVisibility(hideSidebar) {
    const menu = document.querySelector(".menu-vertical");
    if (!(menu instanceof HTMLElement))
      return;
    const sidebarHost = menu.closest(".menu-vertical-container") || menu.closest(".rbx-left-col") || menu.parentElement;
    if (!(sidebarHost instanceof HTMLElement))
      return;
    sidebarHost.style.display = hideSidebar ? "none" : "";
  }
  function updateAccountHeader(showPanel) {
    const pageRoot = document.getElementById("react-user-account-base");
    if (!(pageRoot instanceof HTMLElement))
      return;
    const header = pageRoot.querySelector("h1");
    if (!(header instanceof HTMLElement))
      return;
    if (!header.hasAttribute("data-roprime-original-display")) {
      header.setAttribute("data-roprime-original-display", header.style.display || "");
    }
    if (showPanel) {
      header.style.display = "none";
      return;
    }
    if (header.hasAttribute("data-roprime-original-display")) {
      header.style.display = header.getAttribute("data-roprime-original-display") || "";
    }
  }
  function updateDocumentTitle(showPanel) {
    const root = document.documentElement;
    if (!(root instanceof HTMLElement))
      return;
    if (!root.hasAttribute("data-roprime-original-title"))
      root.setAttribute("data-roprime-original-title", document.title || "");
    if (showPanel)
      document.title = "RoPrime Settings";
    else
      document.title = root.getAttribute("data-roprime-original-title") || document.title;
  }

  // src/content/dropdownMenu.js
  var RP_DROPDOWN_ITEM_CLASS = "roprime-dropdown-entry";
  function getRoPrimeSettingsUrl() {
    return `${window.location.origin}/my/account?roprime=design`;
  }
  function getIconUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL("resources/roprime-icon.png");
    }
    return "resources/roprime-icon.png";
  }
  function injectRoPrimeDropdownItem() {
    const menus = document.querySelectorAll("ul.dropdown-menu");
    if (!menus.length)
      return;
    const iconUrl = getIconUrl();
    const settingsUrl = getRoPrimeSettingsUrl();
    menus.forEach((menu) => {
      if (!(menu instanceof HTMLUListElement))
        return;
      if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`))
        return;
      const li = document.createElement("li");
      li.className = RP_DROPDOWN_ITEM_CLASS;
      li.innerHTML = `<a class="rbx-menu-item" href="${settingsUrl}"><img src="${iconUrl}" alt="" width="14" height="14" style="margin-right:8px;vertical-align:middle;" /><span>RoPrime Settings</span></a>`;
      menu.insertAdjacentElement("afterbegin", li);
    });
  }

  // src/content/panel.js
  function updateOldNavigationBarVisibility() {
    syncOldNavigationBar();
  }
  function syncRoEliteView() {
    injectRoPrimeDropdownItem();
    updateOldNavigationBarVisibility();
    updateSmallNewNavVisibility();
    updateSidebarCompactVisibility();
    updateFriendStylingReimagnedVisibility();
    syncSidebarCompactDecorations();
    injectRoEliteTab(syncRoEliteView);
    ensureAccountDivider();
    const showPanel = isPluginRoute();
    updateAccountHeader(showPanel);
    updateDocumentTitle(showPanel);
    if (!isAccountPage())
      return;
    const standalonePanel = updateStandaloneSettingsVisibility(showPanel);
    if (!(standalonePanel instanceof HTMLElement))
      return;
    bindSettingsControls(standalonePanel, {
      updateOldNavigationBarVisibility,
      updateSmallNewNavVisibility,
      updateSidebarCompactVisibility,
      updateFriendStylingReimagnedVisibility
    }, syncRoEliteView);
    refreshSettingsControls(standalonePanel);
    updateTabState(showPanel, RP_TAB_ID);
    updateSidebarVisibility(showPanel);
    if (settingsState.renameCommunitiesToGroups)
      applyCommunityRename(document.body);
    if (settingsState.renameExperiencesToGames)
      applyExperiencesRename(document.body);
    if (settingsState.renameMarketplaceToAvatarShop)
      applyMarketplaceRename(document.body);
    syncHomeWelcomeModal();
  }

  // src/content/index.js
  function installStorageSyncListener() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged)
      return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[RP_SETTINGS_KEY])
        return;
      loadSettings().finally(() => {
        updateRenameLoop();
        syncRoEliteView();
      });
    });
  }
  function installHistoryListeners() {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("roprime-location-change"));
      return result;
    };
    window.history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("roprime-location-change"));
      return result;
    };
    window.addEventListener("popstate", syncRoEliteView);
    window.addEventListener("roprime-location-change", syncRoEliteView);
  }
  function bootstrap() {
    installStorageSyncListener();
    syncHomeWelcomeModal();
    loadSettings().finally(() => {
      installHistoryListeners();
      updateRenameLoop();
      if (syncIntervalId === null) {
        setSyncIntervalId(window.setInterval(syncRoEliteView, 1200));
      }
      syncRoEliteView();
      applyCommunityRename(document.body);
      applyExperiencesRename(document.body);
      applyMarketplaceRename(document.body);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();

//# debugId=91ACB77000F2663D64756E2164756E21
