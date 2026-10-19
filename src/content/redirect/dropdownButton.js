import {
    buildRoPrimeSettingsFullUrl,
    getExtensionResourceUrl,
    isExtensionContextAlive,
    isExtensionContextInvalidatedError,
    isOnRoPrimeSettingsPage,
    RP_PARAM_KEY_NEW,
    shouldRunRoPrimeOnCurrentPage,
} from '../core/core.js'

const RP_DROPDOWN_ITEM_CLASS = 'roprime-dropdown-entry'

const RP_FOUNDATION_OWN_CLASS = 'roprime-nav-foundation-settings'
const RP_MENU_ICON_ATTR = 'data-roprime-menu-icon'

const SETTINGS_POPOVER_MENU_ID = 'settings-popover-menu'
const FOUNDATION_MENU_SELECTOR = '.nav-foundation-menu'

const ROPRIME_DROPDOWN_SETTINGS_LABEL = 'RoPrime Settings'

const FOUNDATION_MENU_ITEM_CLASS =
    'relative clip group/interactable focus-visible:outline-focus disabled:outline-none foundation-web-menu-item flex items-center content-default text-truncate-split focus-visible:hover:outline-none cursor-pointer stroke-none bg-none text-align-x-left width-full text-body-large padding-x-large padding-y-medium gap-x-large radius-medium'

let rowTemplate = null

let navObserver = null

let observedNavRoots = new WeakSet()

const menuSurvivalObservers = new Set()

let pointerCaptureInstalled = false
let clickDelegationInstalled = false

let navFlushPending = false

let cachedMenuIconUrl = ''
let iconPreloadStarted = false

function getMenuIconUrl() {
    return (
        cachedMenuIconUrl ||
        getExtensionResourceUrl('resources/roprime-icon.png') ||
        ''
    )
}

function ensureIconPreloaded() {
    if (iconPreloadStarted) return
    const extUrl = getExtensionResourceUrl('resources/roprime-icon.png')
    if (!extUrl) return
    iconPreloadStarted = true

    if (document.head && !document.getElementById('roprime-icon-preload')) {
        const link = document.createElement('link')
        link.id = 'roprime-icon-preload'
        link.rel = 'preload'
        link.as = 'image'
        link.href = extUrl
        document.head.appendChild(link)
    }

    const warm = new Image()
    warm.decoding = 'async'
    warm.src = extUrl

    void (async () => {
        try {
            const response = await fetch(extUrl, { cache: 'force-cache' })
            if (!response.ok) return
            const blob = await response.blob()
            if (cachedMenuIconUrl.startsWith('blob:')) {
                try {
                    URL.revokeObjectURL(cachedMenuIconUrl)
                } catch {
                    /* ignore */
                }
            }
            cachedMenuIconUrl = URL.createObjectURL(blob)
            rowTemplate = null
            document
                .querySelectorAll(
                    `a.${RP_FOUNDATION_OWN_CLASS} img[${RP_MENU_ICON_ATTR}], li.${RP_DROPDOWN_ITEM_CLASS} img[${RP_MENU_ICON_ATTR}]`,
                )
                .forEach((img) => {
                    if (!(img instanceof HTMLImageElement)) return
                    const foundation = img.closest(`a.${RP_FOUNDATION_OWN_CLASS}`)
                    const classic = img.closest(`li.${RP_DROPDOWN_ITEM_CLASS}`)
                    if (!isOurFoundationSettingsItem(foundation) && !classic) return
                    img.src = cachedMenuIconUrl
                })
        } catch {
            cachedMenuIconUrl = extUrl
        }
    })()
}

function queueInjectFromNavMutations() {
    if (navFlushPending) return
    navFlushPending = true
    queueMicrotask(() => {
        navFlushPending = false
        try {
            injectRobloxDropdownEntries()
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e
        }
    })
}

// --- Old dropdown button ---

function ensureRowTemplate() {
    if (rowTemplate) return
    const iconUrl = getMenuIconUrl()
    if (!iconUrl) return

    const li = document.createElement('li')
    li.className = RP_DROPDOWN_ITEM_CLASS

    const a = document.createElement('a')
    a.className = 'rbx-menu-item'
    a.style.display = 'inline-flex'
    a.style.alignItems = 'center'
    a.style.gap = '8px'

    const img = document.createElement('img')
    img.src = iconUrl
    img.alt = ''
    img.width = 14
    img.height = 14
    img.setAttribute(RP_MENU_ICON_ATTR, '1')
    img.style.display = 'block'
    img.style.flexShrink = '0'

    const span = document.createElement('span')
    span.textContent = ROPRIME_DROPDOWN_SETTINGS_LABEL

    a.append(img, span)
    li.appendChild(a)
    rowTemplate = li
}

function getSettingsPopoverMenu() {
    const el = document.getElementById(SETTINGS_POPOVER_MENU_ID)
    return el instanceof HTMLUListElement ? el : null
}

function cloneRowForMenu() {
    ensureRowTemplate()
    if (!rowTemplate) return null
    const li = rowTemplate.cloneNode(true)
    const a = li.querySelector('a')
    if (a instanceof HTMLAnchorElement) {
        a.href = buildRoPrimeSettingsFullUrl()
    }
    return li
}

// --- Foundation button ---

function isOurFoundationSettingsItem(el) {
    if (!(el instanceof HTMLAnchorElement)) return false
    if (!el.classList.contains(RP_FOUNDATION_OWN_CLASS)) return false
    const href = String(el.getAttribute('href') || '')
    if (!href.includes('roprime=')) return false
    const title = el.querySelector('.foundation-web-menu-item-title')?.textContent?.trim() ||
        ''
    return title === ROPRIME_DROPDOWN_SETTINGS_LABEL
}

function isRoPrimeIconSrc(src) {
    const value = String(src || '')
    if (!value) return false
    if (value.includes('roprime-icon.png')) return true
    if (cachedMenuIconUrl && value === cachedMenuIconUrl) return true
    const iconUrl = getExtensionResourceUrl('resources/roprime-icon.png')
    return Boolean(iconUrl && value === iconUrl)
}

function stripLeakedRoPrimeIcons(el) {
    if (!(el instanceof HTMLElement)) return
    for (const img of [...el.querySelectorAll('img')]) {
        const marked = img.getAttribute(RP_MENU_ICON_ATTR) === '1'
        const srcMatch = isRoPrimeIconSrc(img.getAttribute('src'))
        if (marked || srcMatch) img.remove()
    }
}

// satinize third party buttons so our icon doesn't inject in them
function sanitizeForeignFoundationClones(scope = document) {
    const root = scope instanceof Document || scope instanceof Element ? scope : document
    const candidates = root.querySelectorAll(
        `a.${RP_FOUNDATION_OWN_CLASS}, a[data-roprime-foundation-settings], button[data-roprime-foundation-settings], ${FOUNDATION_MENU_SELECTOR} a[role="menuitem"], ${FOUNDATION_MENU_SELECTOR} button[role="menuitem"], ${FOUNDATION_MENU_SELECTOR} img[${RP_MENU_ICON_ATTR}]`,
    )
    for (const node of candidates) {
        if (!(node instanceof HTMLElement)) continue

        if (node instanceof HTMLImageElement) {
            const owner = node.closest('a, button')
            if (isOurFoundationSettingsItem(owner)) continue
            if (owner?.closest(`li.${RP_DROPDOWN_ITEM_CLASS}`)) continue
            node.remove()
            continue
        }

        if (isOurFoundationSettingsItem(node)) continue

        node.classList.remove(RP_FOUNDATION_OWN_CLASS)
        node.removeAttribute('data-roprime-foundation-settings')
        stripLeakedRoPrimeIcons(node)
    }
}

function createFoundationSettingsItem() {
    const iconUrl = getMenuIconUrl()
    if (!iconUrl) return null

    const a = document.createElement('a')
    a.setAttribute('role', 'menuitem')
    a.href = buildRoPrimeSettingsFullUrl()
    a.className = `${FOUNDATION_MENU_ITEM_CLASS} ${RP_FOUNDATION_OWN_CLASS}`
    a.tabIndex = -1
    a.dataset.orientation = 'vertical'
    a.style.outlineOffset = '0px'
    a.style.textDecoration = 'none'
    a.style.columnGap = '8px'

    const stateLayer = document.createElement('div')
    stateLayer.setAttribute('aria-hidden', 'true')
    stateLayer.setAttribute('data-testid', 'foundation-web-state-layer')
    stateLayer.className =
        'absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none'

    const img = document.createElement('img')
    img.src = iconUrl
    img.alt = ''
    img.decoding = 'async'
    img.loading = 'eager'
    img.setAttribute(RP_MENU_ICON_ATTR, '1')
    img.style.width = '20px'
    img.style.height = '20px'
    img.style.flexShrink = '0'

    const textWrap = document.createElement('div')
    textWrap.className = 'grow-1 text-truncate-split flex flex-col gap-y-xsmall'

    const title = document.createElement('span')
    title.className = 'foundation-web-menu-item-title text-no-wrap text-truncate-split content-emphasis'
    title.textContent = ROPRIME_DROPDOWN_SETTINGS_LABEL

    textWrap.appendChild(title)
    a.append(stateLayer, img, textWrap)
    return a
}

function getFoundationMenuHost() {
    const menu = document.querySelector(FOUNDATION_MENU_SELECTOR)
    if (!(menu instanceof HTMLElement)) return null
    const group = menu.querySelector(':scope > [role="group"]')
    if (group instanceof HTMLElement) return group
    return menu
}

function getNavigationObserverRoots() {
    const out = []
    for (const id of ['navigation-container', 'navigation', 'header']) {
        const el = document.getElementById(id)
        if (el instanceof HTMLElement) out.push(el)
    }
    if (document.body instanceof HTMLElement) out.push(document.body)
    return out
}

function ensureNavMutationObserver() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return
    if (!navObserver) {
        try {
            navObserver = new MutationObserver(() => queueInjectFromNavMutations())
        } catch {
            navObserver = null
            return
        }
    }
    for (const root of getNavigationObserverRoots()) {
        if (observedNavRoots.has(root)) continue
        try {
            navObserver.observe(root, { childList: true, subtree: true })
            observedNavRoots.add(root)
        } catch {
            /* ignore */
        }
    }
}

function teardownNavMutationObserver() {
    if (navObserver) {
        try {
            navObserver.disconnect()
        } catch {
            /* ignore */
        }
        navObserver = null
    }
    observedNavRoots = new WeakSet()
}

function disconnectAllMenuSurvivalObservers() {
    for (const obs of menuSurvivalObservers) {
        try {
            obs.disconnect()
        } catch {
            /* ignore */
        }
    }
    menuSurvivalObservers.clear()
    const watched = document.getElementById(SETTINGS_POPOVER_MENU_ID)
    if (
        watched instanceof HTMLElement &&
        watched.getAttribute('data-roprime-dropdown-watch') === '1'
    ) {
        watched.removeAttribute('data-roprime-dropdown-watch')
    }
    document.querySelectorAll('[data-roprime-foundation-watch="1"]').forEach((el) => {
        el.removeAttribute('data-roprime-foundation-watch')
    })
}

function ensureMenuSurvivalObserver(menu) {
    if (!(menu instanceof HTMLUListElement)) return
    if (menu.getAttribute('data-roprime-dropdown-watch') === '1') return
    menu.setAttribute('data-roprime-dropdown-watch', '1')

    const obs = new MutationObserver(() => {
        if (!document.contains(menu)) {
            try {
                obs.disconnect()
            } catch {
                /* ignore */
            }
            menuSurvivalObservers.delete(obs)
            menu.removeAttribute('data-roprime-dropdown-watch')
            return
        }
        injectIntoDropdownMenuIfMissing(menu)
    })
    menuSurvivalObservers.add(obs)
    try {
        obs.observe(menu, { childList: true })
    } catch {
        menuSurvivalObservers.delete(obs)
        menu.removeAttribute('data-roprime-dropdown-watch')
    }
}

function ensureFoundationMenuSurvivalObserver(host) {
    if (!(host instanceof HTMLElement)) return
    if (host.getAttribute('data-roprime-foundation-watch') === '1') return
    host.setAttribute('data-roprime-foundation-watch', '1')

    const obs = new MutationObserver(() => {
        if (!document.contains(host)) {
            try {
                obs.disconnect()
            } catch {
                /* ignore */
            }
            menuSurvivalObservers.delete(obs)
            host.removeAttribute('data-roprime-foundation-watch')
            return
        }
        sanitizeForeignFoundationClones(host)
        injectIntoFoundationMenuIfMissing(host)
    })
    menuSurvivalObservers.add(obs)
    try {
        obs.observe(host, { childList: true, subtree: true })
    } catch {
        menuSurvivalObservers.delete(obs)
        host.removeAttribute('data-roprime-foundation-watch')
    }
}

function isLikelyTopNavChromeTarget(target) {
    if (!(target instanceof Element)) return false
    return Boolean(
        target.closest('#navigation') ||
            target.closest('#navigation-container') ||
            target.closest('#header') ||
            target.closest('.rbx-navbar') ||
            target.closest('#rbx-navigation-account-button') ||
            target.closest('[id*="navigation-account"]') ||
            target.closest('[aria-label="Settings"]') ||
            target.closest('[data-testid*="settings"]'),
    )
}

function onPointerDownBeforeOpen(e) {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return
    if (!isLikelyTopNavChromeTarget(e.target)) return
    ensureNavMutationObserver()
    try {
        injectRobloxDropdownEntries()
    } catch (err) {
        if (!isExtensionContextInvalidatedError(err)) throw err
    }
}

function onDelegatedRoPrimeDropdownClick(ev) {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return
    if (!(ev.target instanceof Element)) return

    const classic = ev.target.closest(`li.${RP_DROPDOWN_ITEM_CLASS} > a.rbx-menu-item`)
    const foundation = ev.target.closest(`a.${RP_FOUNDATION_OWN_CLASS}`)
    const a = classic instanceof HTMLAnchorElement ? classic : foundation instanceof HTMLAnchorElement &&
            isOurFoundationSettingsItem(foundation)
        ? foundation
        : null
    if (!a) return

    if (classic) {
        const li = a.closest(`li.${RP_DROPDOWN_ITEM_CLASS}`)
        if (!(li instanceof HTMLElement)) return
        if (!li.closest(`#${SETTINGS_POPOVER_MENU_ID}`)) return
    } else if (!a.closest(FOUNDATION_MENU_SELECTOR)) {
        return
    }

    ev.preventDefault()
    ev.stopPropagation()
    const settingsUrl = buildRoPrimeSettingsFullUrl()
    if (isOnRoPrimeSettingsPage()) globalThis.location.reload()
    else globalThis.location.assign(settingsUrl)
}

function removeRobloxDropdownEntries() {
    const menu = getSettingsPopoverMenu()
    if (menu) {
        menu.querySelectorAll(`li.${RP_DROPDOWN_ITEM_CLASS}`).forEach((n) => {
            n.remove()
        })
    }

    document.querySelectorAll(`a.${RP_FOUNDATION_OWN_CLASS}`).forEach((n) => {
        if (isOurFoundationSettingsItem(n)) n.remove()
        else {
            n.classList.remove(RP_FOUNDATION_OWN_CLASS)
            n.removeAttribute('data-roprime-foundation-settings')
        }
    })
    sanitizeForeignFoundationClones(document)
}

function injectIntoDropdownMenuIfMissing(menu) {
    if (!(menu instanceof HTMLUListElement)) return
    if (menu.id !== SETTINGS_POPOVER_MENU_ID) return
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return
    if (menu.querySelector(`li.${RP_DROPDOWN_ITEM_CLASS}`)) {
        ensureMenuSurvivalObserver(menu)
        return
    }

    const hrefNeedle = `?${RP_PARAM_KEY_NEW}=`
    const foreignPrime = [
        ...menu.querySelectorAll(`a.rbx-menu-item[href*="${hrefNeedle}"]`),
    ].find((node) => {
        const row = node.closest('li')
        return (
            row instanceof HTMLLIElement &&
            !row.classList.contains(RP_DROPDOWN_ITEM_CLASS)
        )
    })
    if (foreignPrime) return

    const li = cloneRowForMenu()
    if (!li) return
    menu.insertAdjacentElement('afterbegin', li)
    ensureMenuSurvivalObserver(menu)
}

function injectIntoFoundationMenuIfMissing(host = getFoundationMenuHost()) {
    if (!(host instanceof HTMLElement)) return
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) return

    sanitizeForeignFoundationClones(host)

    const existing = [...host.querySelectorAll(`a.${RP_FOUNDATION_OWN_CLASS}`)].find(
        (node) => isOurFoundationSettingsItem(node),
    )
    if (existing) {
        ensureFoundationMenuSurvivalObserver(host)
        return
    }

    const item = createFoundationSettingsItem()
    if (!item) return
    host.insertAdjacentElement('afterbegin', item)
    sanitizeForeignFoundationClones(host)
    ensureFoundationMenuSurvivalObserver(host)
}

function injectRobloxDropdownEntries() {
    if (!shouldRunRoPrimeOnCurrentPage() || !isExtensionContextAlive()) {
        removeRobloxDropdownEntries()
        disconnectAllMenuSurvivalObservers()
        return
    }
    ensureIconPreloaded()
    if (!getMenuIconUrl()) return

    sanitizeForeignFoundationClones(document)
    const menu = getSettingsPopoverMenu()
    if (menu) injectIntoDropdownMenuIfMissing(menu)
    injectIntoFoundationMenuIfMissing()
}

export function syncRobloxNavDropdownButton() {
    try {
        if (!isExtensionContextAlive()) return

        if (!shouldRunRoPrimeOnCurrentPage()) {
            stopRobloxNavDropdownButton()
            return
        }

        ensureIconPreloaded()

        if (!pointerCaptureInstalled) {
            document.addEventListener('pointerdown', onPointerDownBeforeOpen, true)
            pointerCaptureInstalled = true
        }
        if (!clickDelegationInstalled) {
            document.addEventListener('click', onDelegatedRoPrimeDropdownClick, true)
            clickDelegationInstalled = true
        }

        ensureNavMutationObserver()
        try {
            injectRobloxDropdownEntries()
        } catch (e) {
            if (!isExtensionContextInvalidatedError(e)) throw e
        }
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) return
        throw e
    }
}

export function stopRobloxNavDropdownButton() {
    if (pointerCaptureInstalled) {
        document.removeEventListener('pointerdown', onPointerDownBeforeOpen, true)
        pointerCaptureInstalled = false
    }
    if (clickDelegationInstalled) {
        document.removeEventListener(
            'click',
            onDelegatedRoPrimeDropdownClick,
            true,
        )
        clickDelegationInstalled = false
    }
    navFlushPending = false
    teardownNavMutationObserver()
    disconnectAllMenuSurvivalObservers()
    removeRobloxDropdownEntries()
    rowTemplate = null
    document.getElementById('roprime-icon-preload')?.remove()
    if (cachedMenuIconUrl.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(cachedMenuIconUrl)
        } catch {
            /* ignore */
        }
    }
    cachedMenuIconUrl = ''
    iconPreloadStarted = false
}
