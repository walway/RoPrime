import { buildRoPrimeSettingsFullUrl, isAccountPage, settingsState } from "./core.js";

function getLogoUrl() {
    try {
        if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
            return chrome.runtime.getURL("resources/roprime-icon.png");
        }
    } catch {
        // ignore
    }
    return "";
}

function getButtonLabel() {
    return "RoPrime Settings";
}

function textIncludes(el, needle) {
    const t = (el?.textContent || "").trim().toLowerCase();
    return t.includes(String(needle).trim().toLowerCase());
}

function ensureLeftMenuButton() {
    if (!isAccountPage()) return;

    const menuList =
        document.querySelector('ul[role="tablist"]') ||
        document.querySelector("ul.menu-vertical");
    if (!(menuList instanceof HTMLElement)) return;

    const existingBtn = menuList.querySelector('[data-roprime-left-settings-btn="1"]');

    // Find "Browser Preferences" row
    let browserPrefLi = null;
    for (const li of menuList.querySelectorAll("li")) {
        if (!(li instanceof HTMLElement)) continue;
        const a = li.querySelector("a");
        if (a && textIncludes(a, "Browser Preferences")) {
            browserPrefLi = li;
            break;
        }
    }
    if (!(browserPrefLi instanceof HTMLElement)) return;

    // Ensure divider exists right after Browser Preferences
    let divider = browserPrefLi.nextElementSibling;
    const isDivider =
        divider instanceof HTMLElement &&
        divider.tagName === "LI" &&
        divider.classList.contains("rbx-divider") &&
        divider.classList.contains("thick-height");
    if (!isDivider) {
        const newDivider = document.createElement("li");
        newDivider.classList.add("rbx-divider", "thick-height");
        newDivider.style.width = "100%";
        newDivider.style.height = "2px";
        newDivider.setAttribute("data-roprime-divider", "1");
        browserPrefLi.insertAdjacentElement("afterend", newDivider);
        divider = newDivider;
    } else if (divider instanceof HTMLElement && divider.getAttribute("data-roprime-divider") === "1") {
        divider.style.width = "100%";
        divider.style.height = "2px";
    }

    // Keep our button near the bottom so other plugins can sit above.
    if (existingBtn instanceof HTMLElement) {
        if (existingBtn.parentElement === menuList && menuList.lastElementChild !== existingBtn) {
            menuList.appendChild(existingBtn);
        }
        return;
    }

    const li = document.createElement("li");
    li.className = "menu-option";
    li.setAttribute("role", "tab");
    li.setAttribute("data-roprime-left-settings-btn", "1");

    const a = document.createElement("a");
    a.className = "menu-option-content";
    a.href = buildRoPrimeSettingsFullUrl();
    a.style.cursor = "pointer";
    a.style.display = "flex";
    a.style.alignItems = "center";

    const img = document.createElement("img");
    img.src = getLogoUrl();
    img.alt = "";
    img.width = 15;
    img.height = 15;
    img.style.marginRight = "6px";
    img.style.verticalAlign = "middle";

    const span = document.createElement("span");
    span.className = "font-caption-header";
    span.textContent = getButtonLabel();
    span.style.fontSize = "12px";

    a.append(img, span);
    li.appendChild(a);

    menuList.appendChild(li);
}

function ensurePluginsButton() {
    if (!isAccountPage()) return;
    if (!settingsState.enablePluginControlPanel) {
        document.querySelector('[data-roprime-left-plugins-btn="1"]')?.remove();
        return;
    }

    const menuList =
        document.querySelector('ul[role="tablist"]') ||
        document.querySelector("ul.menu-vertical");
    if (!(menuList instanceof HTMLElement)) return;

    // Find Browser Preferences row
    let browserPrefLi = null;
    for (const li of menuList.querySelectorAll("li")) {
        if (!(li instanceof HTMLElement)) continue;
        const a = li.querySelector("a");
        if (a && textIncludes(a, "Browser Preferences")) {
            browserPrefLi = li;
            break;
        }
    }
    if (!(browserPrefLi instanceof HTMLElement)) return;

    // Divider must already exist (do not create it here)
    const divider = browserPrefLi.nextElementSibling;
    const isDivider =
        divider instanceof HTMLElement &&
        divider.tagName === "LI" &&
        divider.classList.contains("rbx-divider") &&
        divider.classList.contains("thick-height");
    if (!isDivider) return;

    let existing = menuList.querySelector('[data-roprime-left-plugins-btn="1"]');
    if (!(existing instanceof HTMLElement)) {
        const li = document.createElement("li");
        li.className = "menu-option";
        li.setAttribute("role", "tab");
        li.setAttribute("data-roprime-left-plugins-btn", "1");

        const a = document.createElement("a");
        a.className = "menu-option-content";
        a.href = "#!/plugins";
        a.style.cursor = "pointer";
        a.addEventListener("click", (e) => {
            e.preventDefault();
            // Make our item look selected in Roblox left menu.
            try {
                menuList.querySelectorAll("a.menu-option-content").forEach((link) => {
                    if (!(link instanceof HTMLElement)) return;
                    link.classList.remove("active");
                    link.removeAttribute("aria-current");
                });
                a.classList.add("active");
                a.setAttribute("aria-current", "page");
            } catch {
                // ignore
            }
            // Set the account tab hash to plugins on click (but do NOT keep forcing it after reload).
            try {
                history.replaceState(
                    history.state,
                    "",
                    `${window.location.pathname}${window.location.search}#!/plugins`,
                );
            } catch {
                // ignore
            }
            if (window.location.hash !== "#!/plugins") window.location.hash = "#!/plugins";
            window.dispatchEvent(new Event("roprime-open-plugins-panel"));
        });

        const iconWrap = document.createElement("span");
        iconWrap.style.display = "inline-flex";
        iconWrap.style.alignItems = "center";
        iconWrap.style.justifyContent = "center";
        iconWrap.style.width = "16px";
        iconWrap.style.height = "16px";
        iconWrap.style.marginRight = "8px";
        iconWrap.style.flex = "0 0 auto";

        // Use currentColor so it matches light/dark themes automatically.
        iconWrap.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="30 732 24 20" aria-hidden="true" focusable="false" style="width:16px;height:16px;display:block;">
            <g id="my-place-on">
              <path d="M53,736h-4.4l-1.7-3.4c-0.2-0.3-0.5-0.6-0.9-0.6h-8c-0.4,0-0.7,0.2-0.9,0.6l-1.7,3.4H31c-0.6,0-1,0.4-1,1v14   c0,0.6,0.4,1,1,1h22c0.6,0,1-0.4,1-1v-14C54,736.4,53.6,736,53,736z M35,740c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1c0-0.6,0.4-1,1-1   s1,0.4,1,1V740z M44.7,738h-5.4l-2-1.3l1.3-2.7h6.8l1.3,2.7L44.7,738z M51,740c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1c0-0.6,0.4-1,1-1   s1,0.4,1,1V740z" fill="currentColor"></path>
            </g>
          </svg>
        `.trim();

        const span = document.createElement("span");
        span.className = "font-caption-header";
        span.textContent = "Plugins";
        span.style.fontSize = "12px";

        a.append(iconWrap, span);
        li.appendChild(a);
        existing = li;
    }

    // Put it exactly under the divider, and keep it first.
    if (divider.nextElementSibling !== existing) {
        divider.insertAdjacentElement("afterend", existing);
    }
}

function ensurePopoverButton() {
    const popoverContent = document.querySelector(".popover-content");
    if (!(popoverContent instanceof HTMLElement)) return;

    const ul = popoverContent.querySelector("#settings-popover-menu.dropdown-menu");
    if (!(ul instanceof HTMLUListElement)) return;

    if (ul.querySelector('[data-roprime-popover-btn="1"]')) return;

    // li must be WITHOUT class
    const li = document.createElement("li");
    li.setAttribute("data-roprime-popover-btn", "1");

    // Inside li create a button with class rbx-menu-item and type button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rbx-menu-item";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "8px";
    btn.style.width = "100%";

    const img = document.createElement("img");
    img.src = getLogoUrl();
    img.alt = "";
    img.width = 18;
    img.height = 18;

    btn.append(img, document.createTextNode(getButtonLabel()));

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = buildRoPrimeSettingsFullUrl();
    });

    li.appendChild(btn);
    ul.prepend(li);
}

let syncRafId = null;
function scheduleSync() {
    if (syncRafId !== null) return;
    syncRafId = requestAnimationFrame(() => {
        syncRafId = null;
        ensureLeftMenuButton();
        ensurePluginsButton();
        ensurePopoverButton();
    });
}

let observer = null;
export function syncAccountSettingsButtons() {
    scheduleSync();

    if (observer instanceof MutationObserver) return;
    if (!(document.body instanceof HTMLBodyElement)) return;
    observer = new MutationObserver(() => scheduleSync());
    observer.observe(document.body, { childList: true, subtree: true });
}

