const SIDEBAR_SVG_REGULAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M6 9C6 8.44772 6.44772 8 7 8H9C9.55228 8 10 8.44772 10 9C10 9.55228 9.55228 10 9 10H7C6.44772 10 6 9.55228 6 9Z' fill='black'/%3E %3Cpath d='M6 13C6 12.4477 6.44772 12 7 12H9C9.55228 12 10 12.4477 10 13C10 13.5523 9.55228 14 9 14H7C6.44772 14 6 13.5523 6 13Z' fill='black'/%3E %3Cpath d='M7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17C10 16.4477 9.55228 16 9 16H7Z' fill='black'/%3E %3Cpath d='M6 4C3.79086 4 2 5.79086 2 8V24C2 26.2091 3.79086 28 6 28H26C28.2091 28 30 26.2091 30 24V8C30 5.79086 28.2091 4 26 4H6ZM26 6C27.1046 6 28 6.89543 28 8V24C28 25.1046 27.1046 26 26 26H14V6H26ZM4 24V8C4 6.89543 4.89543 6 6 6H12V26H6C4.89543 26 4 25.1046 4 24Z' fill='black'/%3E%3C/svg%3E"

const SIDEBAR_SVG_FILLED =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M26 4C28.2091 4 30 5.79086 30 8V24C30 26.2091 28.2091 28 26 28H6C3.79086 28 2 26.2091 2 24V8C2 5.79086 3.79086 4 6 4H26ZM14 26H26C27.1046 26 28 25.1046 28 24V8C28 6.89543 27.1046 6 26 6H14V26ZM6 16C5.44772 16 5 16.4477 5 17C5 17.5523 5.44772 18 6 18H10C10.5523 18 11 17.5523 11 17C11 16.4477 10.5523 16 10 16H6ZM6 12C5.44772 12 5 12.4477 5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13C11 12.4477 10.5523 12 10 12H6ZM6 8C5.44772 8 5 8.44772 5 9C5 9.55228 5.44772 10 6 10H10C10.5523 10 11 9.55228 11 9C11 8.44772 10.5523 8 10 8H6Z' fill='black'/%3E%3C/svg%3E"

const COLLAPSE_STYLE_ID = 'roprime-collapse-sidebar-icon-style'

function ensureCollapseIconStyles() {
    if (document.getElementById(COLLAPSE_STYLE_ID)) return
    const style = document.createElement('style')
    style.id = COLLAPSE_STYLE_ID
    style.type = 'text/css'
    style.textContent = `
.icon-regular-sidebar,
.icon-filled-sidebar {
  display: inline-block;
  width: var(--icon-size-medium, 1.5rem);
  height: var(--icon-size-medium, 1.5rem);
  background-color: currentColor;
  -webkit-mask-image: var(--svg);
  mask-image: var(--svg);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
.icon-regular-sidebar {
  --svg: url("${SIDEBAR_SVG_REGULAR}");
}
.icon-filled-sidebar {
  --svg: url("${SIDEBAR_SVG_FILLED}");
}
`.trim()
    ;(document.head || document.documentElement).appendChild(style)
}

function createSidebarIconSpan(filled) {
    ensureCollapseIconStyles()
    const span = document.createElement('span')
    span.className = `grow-0 shrink-0 basis-auto icon ${
        filled ? 'icon-regular-sidebar' : 'icon-filled-sidebar'
    } size-[var(--icon-size-medium)]`
    span.style.transform = 'scale(1.2)'
    span.style.setProperty('transform', 'scale(1.2)', 'important')
    span.style.color = 'white'
    span.style.margin = 'auto'
    span.setAttribute('aria-hidden', 'true')
    return span
}

function findCollapseIcon(button) {
    return button?.querySelector(
        '.icon-regular-sidebar, .icon-filled-sidebar, .roprime-nav-menu-button-icon',
    )
}

function setCollapseIcon(button, filled) {
    const next = createSidebarIconSpan(filled)
    const existing = findCollapseIcon(button)
    if (existing) {
        existing.replaceWith(next)
        return
    }
    button.prepend(next)
}

export function createRoPrimeNavMenuButton(original, options = {}) {
    ensureCollapseIconStyles()
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'menu-button btn-navigation-nav-menu-md'
    button.title = original.title || 'nav menu'
    button.setAttribute('data-roprime-nav-menu-button', '1')
    button.setAttribute(
        'aria-label',
        original.getAttribute('aria-label') || original.title || 'nav menu',
    )
    button.tabIndex = original.tabIndex >= 0 ? original.tabIndex : 0
    button.style.width = '36px'
    button.style.height = '36px'
    button.style.display = 'inline-block'

    button.appendChild(createSidebarIconSpan(!!options.collapsed))
    return button
}

export function setCollapseButtonIcon(button, collapsed) {
    if (!(button instanceof HTMLButtonElement)) return
    setCollapseIcon(button, !!collapsed)
}
