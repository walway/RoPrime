import { settingsState } from "./core.js";

/** Matches selectors in style.css */
const HOST_ID = "roprime-classic-left-nav-host";
const COLLAPSED_CLASS = "roprime-old-navigation-bar-collapsed";

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
    if (!document.body) return false;
    const path = window.location.pathname || "";
    if (/\/login\b/i.test(path) || /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?newlogin\b/i.test(path)) return false;
    return true;
}

function scrapeProfile() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav) return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };

    let profileLink = null;
    for (const a of nav.querySelectorAll("a[href]")) {
        if (!(a instanceof HTMLAnchorElement)) continue;
        const pathOnly = (a.getAttribute("href") || "").replace(/^https?:\/\/[^/]+/i, "");
        if (!/\/users\/\d+/i.test(pathOnly) && !/\/my\/account\b/i.test(pathOnly)) continue;
        if (!a.querySelector("img")) continue;
        profileLink = a;
        break;
    }
    if (!profileLink) return { href: `${window.location.origin}/my/account`, avatar: "", name: "Profile" };

    const img = profileLink.querySelector("img");
    const avatar = img instanceof HTMLImageElement ? img.src || "" : "";
    let name = "Profile";
    const nameSpan = profileLink.querySelector(
        "span[class*='font-body'], span[class*='text-'], span.text-truncate-end, p[class*='text-']",
    );
    if (nameSpan?.textContent?.trim()) name = nameSpan.textContent.trim();

    const href = profileLink.getAttribute("href") || "/my/account";
    const abs = /^https?:/i.test(href) ? href : `${window.location.origin}${href.startsWith("/") ? "" : "/"}${href}`;
    return { href: abs, avatar, name };
}

function scrapeMessagesBadge() {
    const nav = document.querySelector(".left-nav.fixed");
    if (!nav) return null;
    const link = nav.querySelector('a[href*="/messages" i]');
    if (!(link instanceof HTMLAnchorElement)) return null;

    const badgeLike = link.querySelector(
        "[class*='badge' i], [class*='Badge'], [class*='notification' i], [data-testid*='badge' i]",
    );
    if (badgeLike?.textContent) {
        const n = badgeLike.textContent.replace(/\D/g, "");
        if (n) return n.length > 3 ? "99+" : n;
    }
    for (const el of link.querySelectorAll("span, div")) {
        const t = el.textContent?.trim() || "";
        if (/^\d{1,3}$/.test(t)) return t;
    }
    const label = link.getAttribute("aria-label") || "";
    const m = label.match(/(\d+)\s*(unread|new)?/i);
    if (m) return m[1];
    return null;
}

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function bindNativeMenuButtonToggle() {
    const root = document.documentElement;
    if (!root || root.getAttribute("data-roprime-old-nav-menu-bound") === "1") return;
    root.setAttribute("data-roprime-old-nav-menu-bound", "1");

    const handler = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const btn = target.closest("button.menu-button.btn-navigation-nav-menu-md");
        if (!btn) return;
        // Toggle closed/open without touching saved settings.
        root.classList.toggle(COLLAPSED_CLASS);
    };

    // Capture phase to run even if Roblox stops propagation.
    document.addEventListener("click", handler, true);
}

const ICON = {
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
    gift: `<svg class="roprime-cln-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V20"/><path d="M3 12h18"/><path d="M12 8a3 3 0 0 0 3-3c0 1.5-1.5 2-3 2S9 6.5 9 5a3 3 0 0 0 3 3z"/></svg>`,
};

const ORIGIN = () => window.location.origin;

const PRIMARY_LINKS = [
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
    { label: "Buy Gift Cards", path: "/upgrades/giftcards", icon: "gift", extIcon: true },
];

function linkRow(item, messagesBadge) {
    const isAbsolute = /^https?:/i.test(item.path);
    const href = isAbsolute ? item.path : `${ORIGIN()}${item.path}`;
    const target = item.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";

    let cls = "roprime-cln-link";
    if (item.extIcon) cls += " roprime-cln-link--ext-icon";
    if (item.newTab) cls += " roprime-cln-link--new-tab";

    const wrapCls = item.extIcon ? "roprime-cln-icon-wrap roprime-cln-icon-wrap--external" : "roprime-cln-icon-wrap";
    const icon = ICON[item.icon] || ICON.home;

    let tail = "";
    if (item.path === "/messages" && messagesBadge) {
        tail = `<span class="roprime-cln-badge" aria-label="${esc(messagesBadge)} unread">${esc(messagesBadge)}</span>`;
    }

    return `<li><a class="${cls}" href="${esc(href)}"${target}><span class="${wrapCls}">${icon}</span><span class="roprime-cln-label">${esc(item.label)}</span>${tail}</a></li>`;
}

function buildNavHtml(profileHref, avatarUrl, displayName) {
    const links = PRIMARY_LINKS.map((item) =>
        item.path === "/groups"
            ? { ...item, label: settingsState.renameCommunitiesToGroups ? "Groups" : "Communities" }
            : item,
    );
    const badge = scrapeMessagesBadge();
    const primary = links.map((item) => linkRow(item, badge)).join("");

    const avatar = avatarUrl
        ? `<img class="roprime-cln-avatar" src="${esc(avatarUrl)}" alt="" width="36" height="36" />`
        : `<span class="roprime-cln-avatar roprime-cln-avatar--ph" aria-hidden="true"></span>`;

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

/**
 * Mounts the Old Navigation bar when {@link settingsState.oldNavigationBarEnabled} is on and the user is logged in.
 */
export function syncOldNavigationBar() {
    stripLegacyInjections();

    const root = document.documentElement;
    root.classList.remove("roprime-classic-left-nav-on");

    if (!settingsState.oldNavigationBarEnabled) {
        document.getElementById(HOST_ID)?.remove();
        root.classList.remove(COLLAPSED_CLASS);
        try {
            delete window.__oldRobloxOldNavigationBar;
        } catch {
            /* ignore */
        }
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
    } catch {
        /* ignore */
    }

    if (!host.dataset.rpConsoleLogged) {
        host.dataset.rpConsoleLogged = "1";
        console.log("[RoPrime] Old Navigation bar:", host, "| window.__oldRobloxOldNavigationBar");
    }
}
