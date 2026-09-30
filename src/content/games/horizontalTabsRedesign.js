import { settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { registerFeature } from '../features/registry.js'

const ROOT_ATTR = 'data-roprime-horizontal-tabs'
const STYLE_ID = 'roprime-horizontal-tabs-style'
const HIDDEN_ORIGINAL_CLASS = 'roprime-horizontal-tabs-original-hidden'
const HIDDEN_HOST_CLASS = 'roprime-horizontal-tabs-host-hidden'

const TAB_CLASS =
    'relative flex items-center justify-center cursor-pointer bg-none shrink-0 relative clip group/interactable focus-visible:outline-focus disabled:outline-none text-label-medium height-1200 grow-1 padding-x-large padding-top-xlarge padding-bottom-xlarge'
const TAB_BORDER =
    'border-bottom: var(--stroke-thick) solid var(--color-stroke-muted); border-top: none; border-left: none; border-right: none;'
const STATE_LAYER =
    '<div aria-hidden="true" data-testid="foundation-web-state-layer" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>'

const STYLE_CSS = `
.rbx-tabs-horizontal[${ROOT_ATTR}] > #horizontal-tabs.${HIDDEN_ORIGINAL_CLASS},
.rbx-tabs-horizontal[${ROOT_ATTR}] > ul#horizontal-tabs.${HIDDEN_ORIGINAL_CLASS} {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.rbx-tabs-horizontal.${HIDDEN_HOST_CLASS} {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  border: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.rbx-tabs-horizontal[${ROOT_ATTR}] > [${ROOT_ATTR}-ui],
.group-details [${ROOT_ATTR}-ui] {
  width: 100%;
  margin-bottom: 0;
  position: relative;
}
[${ROOT_ATTR}-ui] .roprime-ht-indicator,
.rbx-tabs-horizontal[${ROOT_ATTR}] .roprime-ht-indicator {
  height: var(--stroke-thick);
  z-index: 1;
  opacity: 1 !important;
  margin-top: 46px;
  background-color: var(--color-system-contrast, var(--color-content-emphasis, currentColor));
  pointer-events: none;
}
`.trim()

let tabsObserver = null
let activeObserver = null
let resizeObserver = null
let resizeHandler = null
let hashHandler = null
let indicatorShell = null
let bootObserver = null
let bootDebounceTimer = null
let retryTimer = null
let applyInFlight = false

function onWindowResize() {
    if (indicatorShell instanceof HTMLElement) syncIndicator(indicatorShell)
}

function clearRetryTimer() {
    if (retryTimer != null) {
        globalThis.clearTimeout(retryTimer)
        retryTimer = null
    }
}

function clearBootDebounce() {
    if (bootDebounceTimer != null) {
        globalThis.clearTimeout(bootDebounceTimer)
        bootDebounceTimer = null
    }
}

function ensureStyles() {
    let style = document.getElementById(STYLE_ID)
    if (!(style instanceof HTMLStyleElement)) {
        style = document.createElement('style')
        style.id = STYLE_ID
        ;(document.head || document.documentElement).appendChild(style)
    }
    if (style.textContent !== STYLE_CSS) style.textContent = STYLE_CSS
}

function isGamesDetailsPath(pathname = globalThis.location.pathname) {
    return /\/games\/\d+(?:\/[^/?#]*)?/i.test(String(pathname || ''))
}

function isCommunityDetailsPath(pathname = globalThis.location.pathname) {
    return /\/(?:communities|groups)\/\d+(?:\/[^/?#]*)?/i.test(String(pathname || ''))
}

function isSupportedTabsPath(pathname = globalThis.location.pathname) {
    return isGamesDetailsPath(pathname) || isCommunityDetailsPath(pathname)
}

function findTabsHost() {
    if (isCommunityDetailsPath()) {
        return (
            document.querySelector('.group-details .rbx-tabs-horizontal') ||
            document.querySelector('.rbx-tabs-horizontal')
        )
    }
    return document.querySelector('.rbx-tabs-horizontal')
}

function findOriginalTabs(host) {
    return (
        host?.querySelector(':scope > #horizontal-tabs') ||
        host?.querySelector('#horizontal-tabs') ||
        document.querySelector('#horizontal-tabs.group-foundation-tabs') ||
        document.querySelector('#horizontal-tabs') ||
        null
    )
}

function findGroupContentHost() {
    const details = document.querySelector('.group-details')
    if (!(details instanceof HTMLElement)) return null
    for (const child of details.children) {
        if (!(child instanceof HTMLElement)) continue
        if (
            child.querySelector(
                '.rbx-tabs-horizontal, #horizontal-tabs, .profile-header-with-cover, .group-profile-header',
            )
        ) {
            return child
        }
    }
    return [...details.children].find((node) => node instanceof HTMLElement) || null
}

function elementChildren(parent) {
    if (!(parent instanceof HTMLElement)) return []
    return [...parent.children].filter((node) => node instanceof HTMLElement)
}

function slugFromTab(li) {
    if (!(li instanceof HTMLElement)) return ''
    const id = String(li.id || '').trim()
    if (id.startsWith('tab-')) return id.slice(4)
    if (id && /^[a-z0-9_-]+$/i.test(id)) return id
    for (const cls of li.classList) {
        if (cls.startsWith('tab-') && cls !== 'tab' && cls !== 'rbx-tab' && !cls.startsWith('group-tab')) {
            return cls.slice(4)
        }
    }
    const href = String(li.getAttribute('href') || '').trim()
    const match = href.match(/#\!?\/?([a-z0-9_-]+)/i)
    if (match) return match[1]
    return ''
}

function hrefFromTab(li) {
    if (!(li instanceof HTMLElement)) return ''
    const fromLi = String(li.getAttribute('href') || '').trim()
    if (fromLi && fromLi !== '#' && !fromLi.startsWith('javascript:')) return fromLi
    const anchor = li.querySelector('a.rbx-tab-heading, a')
    const href = String(anchor?.getAttribute('href') || '').trim()
    if (href && href !== '#' && !href.startsWith('javascript:')) return href
    const slug = slugFromTab(li)
    if (!slug) return ''
    return isCommunityDetailsPath() ? `#!/${slug}` : `#${slug}`
}

function labelForTab(li, slug) {
    const lead =
        li.querySelector('.text-lead') ||
        li.querySelector('.rbx-tab-heading span') ||
        li.querySelector('a.rbx-tab-heading') ||
        li.querySelector('a')
    const raw = String(lead?.textContent || li.textContent || '').replace(/\s+/g, ' ').trim()
    return raw || slug || 'Tab'
}

function isTabActive(li, slug) {
    if (!(li instanceof HTMLElement)) return false
    if (li.classList.contains('active')) return true
    const hash = String(globalThis.location.hash || '')
    if (!hash) return false
    const href = hrefFromTab(li)
    if (href && (hash === href || hash.replace(/^#\!?\/?/, '') === slug)) return true
    const normalized = hash.replace(/^#\!?\/?/, '').toLowerCase()
    return Boolean(slug && normalized === String(slug).toLowerCase())
}

function collectSourceTabs(original) {
    if (!(original instanceof HTMLElement)) return []
    return [...original.querySelectorAll(':scope > li.rbx-tab, :scope > li.group-tab, :scope > li')].filter(
        (li) => li instanceof HTMLElement && !li.hidden,
    )
}

function createShell() {
    const root = document.createElement('div')
    root.setAttribute(ROOT_ATTR + '-ui', '1')
    root.dir = 'ltr'
    root.dataset.orientation = 'horizontal'
    root.className =
        'foundation-web-tabs flex flex-col radius-none overflow-hidden roprime-horizontal-tabs relative'

    root.innerHTML = `
<div class="relative scroll-x" style="scrollbar-width: none;">
  <div role="tablist" aria-orientation="horizontal" class="flex items-stretch bg-none border-0 stroke-none" tabindex="0" data-orientation="horizontal" style="outline: none;"></div>
</div>
<div class="absolute bottom-[0px] bg-system-contrast transition-all duration-200 ease-standard-out roprime-ht-indicator" style="height: var(--stroke-thick); z-index: 1; width: 0px; left: 0px; opacity: 1; margin-top: 46px;"></div>
`.trim()
    return root
}

function ensureIndicatorInTabsRoot(shell) {
    if (!(shell instanceof HTMLElement)) return
    if (!shell.classList.contains('relative')) shell.classList.add('relative')

    let indicator = shell.querySelector(':scope > .roprime-ht-indicator')
    const nested = shell.querySelector('.scroll-x .roprime-ht-indicator')
    if (!(indicator instanceof HTMLElement) && nested instanceof HTMLElement) {
        shell.appendChild(nested)
        indicator = nested
    }
    if (!(indicator instanceof HTMLElement)) {
        indicator = document.createElement('div')
        indicator.className =
            'absolute bottom-[0px] bg-system-contrast transition-all duration-200 ease-standard-out roprime-ht-indicator'
        shell.appendChild(indicator)
    }
    indicator.style.height = 'var(--stroke-thick)'
    indicator.style.zIndex = '1'
    indicator.style.opacity = '1'
    indicator.style.marginTop = '46px'
    if (!indicator.style.width) indicator.style.width = '0px'
    if (!indicator.style.left) indicator.style.left = '0px'
}

function syncIndicator(shell) {
    ensureIndicatorInTabsRoot(shell)
    const tablist = shell.querySelector('[role="tablist"]')
    const indicator = shell.querySelector(':scope > .roprime-ht-indicator')
    if (!(tablist instanceof HTMLElement) || !(indicator instanceof HTMLElement)) return

    const active =
        tablist.querySelector('[role="tab"][data-state="active"]') ||
        tablist.querySelector('[role="tab"][aria-selected="true"]')
    if (!(active instanceof HTMLElement)) {
        indicator.style.width = '0px'
        indicator.style.opacity = '0'
        return
    }

    const shellRect = shell.getBoundingClientRect()
    const btnRect = active.getBoundingClientRect()
    const scrollX = shell.querySelector('.scroll-x')
    const scrollLeft = scrollX instanceof HTMLElement ? scrollX.scrollLeft : 0
    const left = Math.max(0, btnRect.left - shellRect.left + scrollLeft)
    const width = Math.max(0, btnRect.width)

    indicator.style.opacity = '1'
    indicator.style.marginTop = '46px'
    indicator.style.width = `${width}px`
    indicator.style.left = `${left}px`
}

function setButtonActive(button, active) {
    button.setAttribute('aria-selected', active ? 'true' : 'false')
    button.setAttribute('data-state', active ? 'active' : 'inactive')
    button.tabIndex = active ? 0 : -1
}

function activateOriginalTab(li) {
    if (!(li instanceof HTMLElement)) return
    const anchor =
        li.querySelector('a.rbx-tab-heading[href]') ||
        li.querySelector('a.rbx-tab-heading') ||
        li.querySelector('a')

        if (li.hasAttribute('href') || li.hasAttribute('ui-sref') || li.hasAttribute('ng-click')) {
        li.click()
        return
    }
    if (anchor instanceof HTMLElement) {
        anchor.click()
        return
    }
    li.click()
}

function rebuildButtons(shell, original) {
    const tablist = shell.querySelector('[role="tablist"]')
    if (!(tablist instanceof HTMLElement)) return

    const sourceTabs = collectSourceTabs(original)
    const existing = [...tablist.querySelectorAll('[role="tab"]')]

    const signature = sourceTabs
        .map((li) => {
            const slug = slugFromTab(li)
            return `${slug}|${hrefFromTab(li)}|${labelForTab(li, slug)}|${isTabActive(li, slug) ? 1 : 0}`
        })
        .join('||')
    if (shell.dataset.roprimeHtSig === signature && existing.length === sourceTabs.length) {
        syncIndicator(shell)
        return
    }
    shell.dataset.roprimeHtSig = signature

    tablist.textContent = ''
    sourceTabs.forEach((li, index) => {
        const slug = slugFromTab(li) || `tab-${index}`
        const href = hrefFromTab(li)
        const label = labelForTab(li, slug)
        const isActive = isTabActive(li, slug)

        const button = document.createElement('button')
        button.type = 'button'
        button.setAttribute('role', 'tab')
        button.className = TAB_CLASS
        button.style.cssText = TAB_BORDER
        button.dataset.orientation = 'horizontal'
        button.dataset.roprimeHtSlug = slug
        button.dataset.roprimeHtHref = href
        button.id = `roprime-ht-trigger-${slug}`
        setButtonActive(button, isActive)

        button.innerHTML = `
${STATE_LAYER}
<div class="flex items-center justify-center height-600 relative">
  <span class="flex items-center justify-center gap-small">
    <span></span>
  </span>
</div>
`.trim()
        const labelEl = button.querySelector('.gap-small > span')
        if (labelEl) labelEl.textContent = label

        button.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            for (const peer of tablist.querySelectorAll('[role="tab"]')) {
                if (peer instanceof HTMLElement) setButtonActive(peer, peer === button)
            }
            syncIndicator(shell)
            activateOriginalTab(li)
            globalThis.requestAnimationFrame(() => {
                syncFromOriginal(shell, original)
            })
            globalThis.setTimeout(() => syncFromOriginal(shell, original), 150)
        })

        tablist.appendChild(button)
    })

    syncIndicator(shell)
}

function syncFromOriginal(shell, original) {
    if (!(shell instanceof HTMLElement) || !(original instanceof HTMLElement)) return
    rebuildButtons(shell, original)

    const tablist = shell.querySelector('[role="tablist"]')
    if (!(tablist instanceof HTMLElement)) return

    const sourceTabs = collectSourceTabs(original)
    const buttons = [...tablist.querySelectorAll('[role="tab"]')]
    sourceTabs.forEach((li, index) => {
        const button = buttons[index]
        if (!(button instanceof HTMLElement)) return
        setButtonActive(button, isTabActive(li, slugFromTab(li)))
    })
    syncIndicator(shell)
}

function redesignIsActive(host) {
    const shell = document.querySelector(`[${ROOT_ATTR}-ui]`)
    if (!(shell instanceof HTMLElement) || !shell.isConnected) return false
    if (!(host instanceof HTMLElement) || !host.isConnected) return false
    if (!host.hasAttribute(ROOT_ATTR)) return false
    if (isCommunityDetailsPath() && !host.classList.contains(HIDDEN_HOST_CLASS)) {
        return false
    }
    if (isCommunityDetailsPath()) {
        const groupContent = findGroupContentHost()
        if (groupContent instanceof HTMLElement && shell.parentElement !== groupContent) {
            return false
        }
    } else if (!host.contains(shell) && shell.parentElement !== host) {

        return false
    }
    return true
}

function scheduleBootApply() {
    clearBootDebounce()
    bootDebounceTimer = globalThis.setTimeout(() => {
        bootDebounceTimer = null
        try {
            applyHorizontalTabsRedesign()
        } catch (error) {
            console.warn('RoPrime horizontal tabs redesign failed', error)
        }
    }, 50)
}

function ensureBootObserver() {
    if (bootObserver) return
    bootObserver = new MutationObserver(() => {
        if (
            !shouldRunRoPrimeOnCurrentPage() ||
            !settingsState.horizontalTabsRedesignEnabled ||
            !isSupportedTabsPath()
        ) {
            return
        }
        const host = findTabsHost()
        const original = findOriginalTabs(host)
        if (!(host instanceof HTMLElement) || !(original instanceof HTMLElement)) return
        if (redesignIsActive(host)) return
        scheduleBootApply()
    })
    const start = () => {
        if (!document.documentElement) return
        bootObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'href'],
        })
    }
    if (document.documentElement) start()
    else document.addEventListener('DOMContentLoaded', start, { once: true })
}

function stopBootObserver() {
    clearBootDebounce()
    bootObserver?.disconnect()
    bootObserver = null
}

function scheduleRetriesWhileMissing() {
    clearRetryTimer()
    let attempts = 0
    const tick = () => {
        retryTimer = null
        if (
            !shouldRunRoPrimeOnCurrentPage() ||
            !settingsState.horizontalTabsRedesignEnabled ||
            !isSupportedTabsPath()
        ) {
            return
        }
        const host = findTabsHost()
        if (redesignIsActive(host)) return
        applyHorizontalTabsRedesign()
        attempts += 1
        if (attempts < 40 && !redesignIsActive(findTabsHost())) {
            retryTimer = globalThis.setTimeout(tick, 200)
        }
    }
    retryTimer = globalThis.setTimeout(tick, 100)
}

function disconnectObservers() {
    tabsObserver?.disconnect()
    tabsObserver = null
    activeObserver?.disconnect()
    activeObserver = null
    resizeObserver?.disconnect()
    resizeObserver = null
    if (resizeHandler) {
        globalThis.removeEventListener('resize', resizeHandler)
        resizeHandler = null
    }
    if (hashHandler) {
        globalThis.removeEventListener('hashchange', hashHandler)
        hashHandler = null
    }
    indicatorShell = null
}

function removeRedesign() {
    clearRetryTimer()
    clearBootDebounce()
    disconnectObservers()
    document.querySelectorAll(`[${ROOT_ATTR}-ui]`).forEach((node) => node.remove())
    document.querySelectorAll(`.${HIDDEN_ORIGINAL_CLASS}`).forEach((node) => {
        node.classList.remove(HIDDEN_ORIGINAL_CLASS)
    })
    document.querySelectorAll(`.${HIDDEN_HOST_CLASS}`).forEach((node) => {
        node.classList.remove(HIDDEN_HOST_CLASS)
    })
    document.querySelectorAll(`.rbx-tabs-horizontal[${ROOT_ATTR}]`).forEach((host) => {
        host.removeAttribute(ROOT_ATTR)
    })
}

function installObservers(host, original, shell) {
    disconnectObservers()
    indicatorShell = shell

    tabsObserver = new MutationObserver(() => {
        syncFromOriginal(shell, original)
    })
    tabsObserver.observe(original, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'href', 'style'],
    })

    activeObserver = new MutationObserver(() => {
        syncFromOriginal(shell, original)
    })
    activeObserver.observe(host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
    })

    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => syncIndicator(shell))
        resizeObserver.observe(shell)
        const tablist = shell.querySelector('[role="tablist"]')
        if (tablist) resizeObserver.observe(tablist)
    }

    resizeHandler = onWindowResize
    globalThis.addEventListener('resize', resizeHandler, { passive: true })

    hashHandler = () => syncFromOriginal(shell, original)
    globalThis.addEventListener('hashchange', hashHandler)
}

function placeShellInGroupContent(contentHost, shell) {
    if (!(contentHost instanceof HTMLElement) || !(shell instanceof HTMLElement)) return

    const kids = elementChildren(contentHost).filter(
        (node) => node !== shell && !node.hasAttribute(`${ROOT_ATTR}-ui`),
    )
    if (!shell.isConnected || shell.parentElement !== contentHost) {
        if (kids[0]) kids[0].after(shell)
        else contentHost.appendChild(shell)
        return
    }

    const positioned = elementChildren(contentHost)
    const shellIndex = positioned.indexOf(shell)
    if (shellIndex === 1) return
    if (kids[0]) kids[0].after(shell)
    else contentHost.insertBefore(shell, contentHost.firstChild)
}

function applyHorizontalTabsRedesign() {
    ensureStyles()
    ensureBootObserver()

    if (
        !shouldRunRoPrimeOnCurrentPage() ||
        !settingsState.horizontalTabsRedesignEnabled ||
        !isSupportedTabsPath()
    ) {
        stopBootObserver()
        removeRedesign()
        return
    }

    const host = findTabsHost()
    const original = findOriginalTabs(host)
    if (!(host instanceof HTMLElement) || !(original instanceof HTMLElement)) {
        scheduleRetriesWhileMissing()
        return
    }

    if (applyInFlight) return
    applyInFlight = true
    try {
        host.setAttribute(ROOT_ATTR, '1')
        original.classList.add(HIDDEN_ORIGINAL_CLASS)

        const community = isCommunityDetailsPath()
        const groupContent = community ? findGroupContentHost() : null

        let shell = document.querySelector(`[${ROOT_ATTR}-ui]`)
        if (!(shell instanceof HTMLElement) || !shell.isConnected) {
            shell = createShell()
            if (groupContent instanceof HTMLElement) {
                placeShellInGroupContent(groupContent, shell)
                host.classList.add(HIDDEN_HOST_CLASS)
            } else {
                host.insertBefore(shell, host.firstChild)
            }
        } else {
            ensureIndicatorInTabsRoot(shell)
            if (groupContent instanceof HTMLElement) {
                placeShellInGroupContent(groupContent, shell)
                host.classList.add(HIDDEN_HOST_CLASS)
            } else if (shell.parentElement !== host) {
                host.insertBefore(shell, host.firstChild)
            }
        }

        if (community) host.classList.add(HIDDEN_HOST_CLASS)

        syncFromOriginal(shell, original)
        installObservers(host, original, shell)
        clearRetryTimer()
    } finally {
        applyInFlight = false
    }
}

export function syncHorizontalTabsRedesign() {
    try {
        ensureBootObserver()
        applyHorizontalTabsRedesign()
        if (
            settingsState.horizontalTabsRedesignEnabled &&
            isSupportedTabsPath() &&
            !redesignIsActive(findTabsHost())
        ) {
            scheduleRetriesWhileMissing()
        }
    } catch (error) {
        console.warn('RoPrime horizontal tabs redesign failed', error)
    }
}

registerFeature(syncHorizontalTabsRedesign)
