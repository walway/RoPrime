const RP_DROPDOWN_ITEM_CLASS = "roprime-dropdown-entry";

function getRoPrimeSettingsUrl() {
    return `${window.location.origin}/my/account?roprime=design`;
}

function getIconUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
        return chrome.runtime.getURL("resources/roprime-icon.png");
    }
    return "resources/roprime-icon.png";
}

export function injectRoPrimeDropdownItem() {
    const menus = document.querySelectorAll("ul.dropdown-menu");
    if (!menus.length) return;

    const iconUrl = getIconUrl();
    const settingsUrl = getRoPrimeSettingsUrl();

    menus.forEach((menu) => {
        if (!(menu instanceof HTMLUListElement)) return;
        if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`)) return;

        const li = document.createElement("li");
        li.className = RP_DROPDOWN_ITEM_CLASS;
        li.innerHTML = `<a class="rbx-menu-item" href="${settingsUrl}"><img src="${iconUrl}" alt="" width="14" height="14" style="margin-right:8px;vertical-align:middle;" /><span>RoPrime Settings</span></a>`;
        menu.insertAdjacentElement("afterbegin", li);
    });
}
