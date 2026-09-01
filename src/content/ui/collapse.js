import { createSvgIcon } from "./dom.js";

const MUI_ICON_BUTTON =
  "MuiButtonBase-root MuiIconButton-root MuiIconButton-colorSecondary MuiIconButton-sizeMedium";
const MUI_TOUCH_RIPPLE = "MuiTouchRipple-root";

const SIDEBAR_ICON_REGULAR_PATHS = [
  "M6 9C6 8.44772 6.44772 8 7 8H9C9.55228 8 10 8.44772 10 9C10 9.55228 9.55228 10 9 10H7C6.44772 10 6 9.55228 6 9Z",
  "M6 13C6 12.4477 6.44772 12 7 12H9C9.55228 12 10 12.4477 10 13C10 13.5523 9.55228 14 9 14H7C6.44772 14 6 13.5523 6 13Z",
  "M7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17C10 16.4477 9.55228 16 9 16H7Z",
  "M6 4C3.79086 4 2 5.79086 2 8V24C2 26.2091 3.79086 28 6 28H26C28.2091 28 30 26.2091 30 24V8C30 5.79086 28.2091 4 26 4H6ZM26 6C27.1046 6 28 6.89543 28 8V24C28 25.1046 27.1046 26 26 26H14V6H26ZM4 24V8C4 6.89543 4.89543 6 6 6H12V26H6C4.89543 26 4 25.1046 4 24Z",
];

const SIDEBAR_ICON_FILLED_PATHS = [
  "M26 4C28.2091 4 30 5.79086 30 8V24C30 26.2091 28.2091 28 26 28H6C3.79086 28 2 26.2091 2 24V8C2 5.79086 3.79086 4 6 4H26ZM14 26H26C27.1046 26 28 25.1046 28 24V8C28 6.89543 27.1046 6 26 6H14V26ZM6 16C5.44772 16 5 16.4477 5 17C5 17.5523 5.44772 18 6 18H10C10.5523 18 11 17.5523 11 17C11 16.4477 10.5523 16 10 16H6ZM6 12C5.44772 12 5 12.4477 5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13C11 12.4477 10.5523 12 10 12H6ZM6 8C5.44772 8 5 8.44772 5 9C5 9.55228 5.44772 10 6 10H10C10.5523 10 11 9.55228 11 9C11 8.44772 10.5523 8 10 8H6Z",
];

function createSidebarCollapseSvg(filled) {
  const svg = createSvgIcon(
    filled ? SIDEBAR_ICON_FILLED_PATHS : SIDEBAR_ICON_REGULAR_PATHS,
    {
      viewBox: "0 0 32 32",
      className: "roprime-nav-menu-button-icon",
    },
  );
  svg.setAttribute("width", "32");
  svg.setAttribute("height", "32");
  svg.setAttribute("focusable", "false");
  svg.style.backgroundSize = "56px";
  svg.style.width = "28px";
  svg.style.height = "28px";
  svg.dataset.testid = filled ? "SidebarOpenIcon" : "SidebarIcon";
  return svg;
}

function findCollapseSvg(button) {
  return button?.querySelector("svg.roprime-nav-menu-button-icon");
}

function setCollapseSvgIcon(button, filled) {
  const existing = findCollapseSvg(button);
  const svg = createSidebarCollapseSvg(filled);
  if (existing) {
    existing.replaceWith(svg);
    return;
  }
  const label = button.querySelector(".roprime-nav-menu-button-label");
  if (label) label.prepend(svg);
}

export function createRoPrimeNavMenuButton(original, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `menu-button btn-navigation-nav-menu-md roprime-nav-menu-button ${MUI_ICON_BUTTON}`;
  button.title = original.title || "nav menu";
  button.setAttribute("data-roprime-nav-menu-button", "1");
  button.setAttribute(
    "aria-label",
    original.getAttribute("aria-label") || original.title || "nav menu",
  );
  button.tabIndex = original.tabIndex >= 0 ? original.tabIndex : 0;

  button.style.visibility = original.style.visibility || "visible";
  button.style.opacity = original.style.opacity || "1";
  button.style.pointerEvents = original.style.pointerEvents || "auto";

  const label = document.createElement("span");
  label.className = "MuiIconButton-label roprime-nav-menu-button-label";
  label.appendChild(createSidebarCollapseSvg(!options.collapsed));

  const ripple = document.createElement("span");
  ripple.className = `${MUI_TOUCH_RIPPLE} roprime-mui-ripple-root roprime-nav-menu-button-ripple`;

  button.append(label, ripple);
  return button;
}

export function setCollapseButtonIcon(button, collapsed) {
  if (!(button instanceof HTMLButtonElement)) return;
  setCollapseSvgIcon(button, !collapsed);
}
