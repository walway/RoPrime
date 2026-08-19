const MUI_ICON_BUTTON = 'MuiButtonBase-root MuiIconButton-root MuiIconButton-colorSecondary MuiIconButton-sizeMedium'
const MUI_SVG_ICON = 'MuiSvgIcon-root MuiSvgIcon-fontSizeMedium'
const MUI_TOUCH_RIPPLE = 'MuiTouchRipple-root'

const MENU_OPEN_PATH = 'M3 18h13v-2H3zm0-5h10v-2H3zm0-7v2h13V6zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5z'

const MENU_PATH = 'M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z'

function ensureSvgPath(svg, collapsed) {
    if (!(svg instanceof SVGElement)) return
    const path = svg.querySelector('path')
    if (!(path instanceof SVGPathElement)) return
    path.setAttribute('d', collapsed ? MENU_PATH : MENU_OPEN_PATH)
    svg.setAttribute('data-testid', collapsed ? 'MenuIcon' : 'MenuOpenIcon')
}

export function createRoPrimeNavMenuButton(original, options = {}) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `menu-button btn-navigation-nav-menu-md roprime-nav-menu-button ${MUI_ICON_BUTTON}`
    button.title = original.title || 'nav menu'
    button.setAttribute('data-roprime-nav-menu-button', '1')
    button.setAttribute(
        'aria-label',
        original.getAttribute('aria-label') || original.title || 'nav menu',
    )
    button.tabIndex = original.tabIndex >= 0 ? original.tabIndex : 0

    const visibility = original.style.visibility || 'visible'
    const opacity = original.style.opacity || '1'
    const pointerEvents = original.style.pointerEvents || 'auto'
    button.style.visibility = visibility
    button.style.opacity = opacity
    button.style.pointerEvents = pointerEvents

    const collapsed = !!options.collapsed
    const svgPath = collapsed ? MENU_PATH : MENU_OPEN_PATH
    const testId = collapsed ? 'MenuIcon' : 'MenuOpenIcon'

    button.innerHTML = `<span class="MuiIconButton-label roprime-nav-menu-button-label">
		<svg class="${MUI_SVG_ICON} roprime-nav-menu-button-icon" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="${testId}">
			<path fill="currentColor" d="${svgPath}"></path>
		</svg>
	</span>
	<span class="${MUI_TOUCH_RIPPLE} roprime-mui-ripple-root roprime-nav-menu-button-ripple"></span>`

    return button
}

export function setCollapseButtonIcon(button, collapsed) {
    if (!(button instanceof HTMLButtonElement)) return
    const svg = button.querySelector('svg')
    ensureSvgPath(svg, collapsed)
}
