import { getExtensionResourceUrl } from "../core/core.js";

const RP_MATERIAL_SYMBOLS_STYLE_ID = "roprime-material-symbols-font";

export const SETTINGS_NAV_ICONS = {
  search: "search",
  design: "palette",
  home: "home",
  settings: "settings",
  privacy: "shield",
  other: "extension",
  info: "info",
  developer: "code",
};

let materialSymbolsReady = false;

export function ensureMaterialSymbolsFont() {
  if (materialSymbolsReady) return;
  if (document.getElementById(RP_MATERIAL_SYMBOLS_STYLE_ID)) {
    materialSymbolsReady = true;
    return;
  }

  const fontUrl = getExtensionResourceUrl(
    "resources/vendor/material-symbols-outlined.ttf",
  );
  if (!fontUrl) return;

  const style = document.createElement("style");
  style.id = RP_MATERIAL_SYMBOLS_STYLE_ID;
  style.textContent = `
@font-face {
  font-family: "Material Symbols Outlined";
  font-style: normal;
  font-weight: 400;
  src: url(${JSON.stringify(fontUrl)}) format("truetype");
}

.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: "liga";
  -webkit-font-smoothing: antialiased;
}
`;
  (document.head || document.documentElement).appendChild(style);
  materialSymbolsReady = true;
}

export function createSettingsNavIcon(symbolName) {
  ensureMaterialSymbolsFont();
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined roprime-settings-nav-icon";
  icon.textContent = symbolName;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}
