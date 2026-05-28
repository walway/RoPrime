/** Material-style icons (inline SVG, no MUI dependency). */

/** Same path as @mui/icons-material/MenuOpen */
const MENU_OPEN_PATH =
	"M3 18h13v-2H3zm0-5h10v-2H3zm0-7v2h13V6zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5z";

const MUI_ICON_BUTTON =
	"MuiButtonBase-root MuiIconButton-root MuiIconButton-colorSecondary MuiIconButton-sizeMedium";
const MUI_SVG_ICON = "MuiSvgIcon-root MuiSvgIcon-fontSizeMedium";
const MUI_TOUCH_RIPPLE = "MuiTouchRipple-root";

/**
 * Replaces Roblox's `button.menu-button > span.icon-nav-menu` with a MUI MenuOpen icon button.
 * Keeps Roblox nav classes and adds `roprime-nav-menu-button`.
 *
 * @param {HTMLButtonElement} original
 */
export function createRoPrimeNavMenuButton(original) {
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

	const visibility = original.style.visibility || "visible";
	const opacity = original.style.opacity || "1";
	const pointerEvents = original.style.pointerEvents || "auto";
	button.style.visibility = visibility;
	button.style.opacity = opacity;
	button.style.pointerEvents = pointerEvents;

	button.innerHTML = `<span class="MuiIconButton-label roprime-nav-menu-button-label">
		<svg class="${MUI_SVG_ICON} roprime-nav-menu-button-icon" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="MenuOpenIcon">
			<path fill="currentColor" d="${MENU_OPEN_PATH}"></path>
		</svg>
	</span>
	<span class="${MUI_TOUCH_RIPPLE} roprime-nav-menu-button-ripple"></span>`;

	return button;
}

export const DELETE_ICON_SVG = `<svg class="roprime-sidebar-delete-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

/** Same glyph as @mui/icons-material/Add */
export const ADD_ICON_SVG = `<svg class="roprime-sidebar-add-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
