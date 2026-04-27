import { RP_SMALL_NEW_NAV_STYLE_ID, settingsState } from "./core.js";

export function updateSmallNewNavVisibility() {
    const existingStyle = document.getElementById(RP_SMALL_NEW_NAV_STYLE_ID);
    if (!settingsState.smallNewNavigationBarEnabled) {
        if (existingStyle instanceof HTMLStyleElement) existingStyle.remove();
        return;
    }
    if (existingStyle instanceof HTMLStyleElement) return;
    const style = document.createElement("style");
    style.id = RP_SMALL_NEW_NAV_STYLE_ID;
    style.textContent = [
        ".width-\\[288px\\], .width-\\[289px\\], [class~=\"width-[288px]\"], [class~=\"width-[289px]\"] { width: 200px !important; min-width: 0 !important; max-width: 200px !important; }",
    ].join("\n");
    document.documentElement.appendChild(style);
}
