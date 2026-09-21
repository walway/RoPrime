import { shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { el } from '../ui/dom.js'

const MARK_ATTR = 'data-roprime-menu-secondary'
const ANCHOR_ATTR = 'data-roprime-menu-option-id'
const MENU_PANEL_WIDTH = 160
const SUBMENU_GAP_PX = 3
const HIDE_DELAY_MS = 40

let observer = null
let installed = false
let menuOptionIdCounter = 0
const hoverControllers = new Map()

function normalizeHref(value) {
    return String(value || '')
        .trim()
        .replace(/\/+$/, '')
}

export function isInventoryPage() {
    const path = globalThis.location.pathname || ''
    return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?users\/inventory\/?$/i.test(
        path,
    )
}

export function isFavoritesPage() {
    const path = globalThis.location.pathname || ''
    return /^\/(?:[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/)?users\/\d+\/favorites(?:\/|$)/i.test(
        path,
    )
}

export function isInventoryOrFavoritesPage() {
    return isInventoryPage() || isFavoritesPage()
}

function currentHash() {
    return normalizeHref(globalThis.location.hash)
}

function findMenuOptionsWithSecondary(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document
    const options = []
    for (
        const menuOption of scope.querySelectorAll(
            '.menu-vertical .menu-option, .menu-vertical-container .menu-option',
        )
    ) {
        if (!(menuOption instanceof HTMLElement)) continue
        const native = menuOption.querySelector(
            `.menu-secondary-container:not([${MARK_ATTR}="1"])`,
        )
        if (!(native instanceof HTMLElement)) continue
        const items = collectNativeSubcategories(native)
        if (items.length <= 1) continue
        options.push({ menuOption, native, items })
    }
    return options
}

function collectNativeSubcategories(nativeContainer) {
    const items = []
    for (
        const option of nativeContainer.querySelectorAll(
            '.menu-secondary-option',
        )
    ) {
        if (!(option instanceof HTMLElement)) continue
        const labelNode = option.querySelector('.menu-text, .font-caption-header')
        const displayName = (
            labelNode?.textContent ||
            option.textContent ||
            ''
        ).trim()
        const href = normalizeHref(
            option.getAttribute('href') ||
                option.querySelector('a[href]')?.getAttribute('href') ||
                '',
        )
        if (!displayName && !href) continue
        items.push({
            displayName: displayName || href,
            href,
            uiSref: option.getAttribute('ui-sref') || '',
            ngClass: option.getAttribute('ng-class') || '',
            ngRepeat: option.getAttribute('ng-repeat') || 'subcategory in category.items',
        })
    }
    return items
}

function hideNativeSecondaryContainers(menuOption) {
    if (!(menuOption instanceof HTMLElement)) return
    for (
        const native of menuOption.querySelectorAll(
            `.menu-secondary-container:not([${MARK_ATTR}="1"])`,
        )
    ) {
        if (!(native instanceof HTMLElement)) continue
        native.hidden = true
        native.style.display = 'none'
        native.setAttribute('aria-hidden', 'true')
    }
}

function positionSecondaryContainer(container, menuOption) {
    if (!(container instanceof HTMLElement)) return
    if (!(menuOption instanceof HTMLElement)) return

    const rect = menuOption.getBoundingClientRect()
    container.style.position = 'fixed'
    container.style.top = `${Math.max(0, rect.top)}px`
    container.style.left = `${rect.left + MENU_PANEL_WIDTH + SUBMENU_GAP_PX}px`
    container.style.paddingLeft = '10px'
    container.style.marginLeft = '-10px'
}

function buildSecondaryOption(subcategory, activeHref) {
    const item = document.createElement('li')
    item.className = 'menu-secondary-option ng-scope'
    if (
        subcategory.href &&
        activeHref &&
        normalizeHref(subcategory.href) === activeHref
    ) {
        item.classList.add('active')
    }
    item.setAttribute(
        'ng-repeat',
        subcategory.ngRepeat || 'subcategory in category.items',
    )
    if (subcategory.uiSref) {
        item.setAttribute('ui-sref', subcategory.uiSref)
    } else {
        item.setAttribute(
            'ui-sref',
            'subcategory({categoryName: $ctrl.makeUrlFriendly(category.name), subcategoryName: $ctrl.makeUrlFriendly(subcategory.name)})',
        )
    }
    item.setAttribute('ng-click', '$event.stopPropagation()')
    item.setAttribute(
        'ng-class',
        subcategory.ngClass ||
            "{'active': $ctrl.currentData.subcategory.name == subcategory.name}",
    )
    if (subcategory.href) item.setAttribute('href', subcategory.href)

    const label = el('span', 'font-caption-header menu-text ng-binding')
    label.setAttribute('ng-bind', 'subcategory.displayName')
    label.textContent = subcategory.displayName
    item.appendChild(label)

    item.addEventListener('click', (event) => {
        event.stopPropagation()
        if (!subcategory.href) return
        if (globalThis.location.hash !== subcategory.href) {
            globalThis.location.hash = subcategory.href
        }
        syncActiveSecondaryOptions()
    })

    return item
}

function buildSecondaryContainer(items) {
    const container = el('div', 'menu-secondary-container')
    container.setAttribute(MARK_ATTR, '1')
    container.setAttribute('ng-show', 'category.items.length > 1')
    container.setAttribute('hover', 'false')
    container.hidden = true
    container.style.display = 'none'

    const list = el('ul', 'menu-secondary')

    const activeHref = currentHash()
    for (const subcategory of items) {
        list.appendChild(buildSecondaryOption(subcategory, activeHref))
    }

    container.appendChild(list)
    document.body.appendChild(container)
    return container
}

function getMenuOptionId(menuOption) {
    if (!(menuOption instanceof HTMLElement)) return ''
    if (!menuOption.dataset.roprimeMenuOptionId) {
        menuOptionIdCounter += 1
        menuOption.dataset.roprimeMenuOptionId = String(menuOptionIdCounter)
    }
    return menuOption.dataset.roprimeMenuOptionId
}

function findPortaledContainer(menuOptionId) {
    if (!menuOptionId) return null
    const container = document.querySelector(
        `.menu-secondary-container[${MARK_ATTR}="1"][${ANCHOR_ATTR}="${menuOptionId}"]`,
    )
    return container instanceof HTMLElement ? container : null
}

function destroyHoverController(menuOptionId) {
    const controller = hoverControllers.get(menuOptionId)
    if (!controller) return
    controller.destroy()
    hoverControllers.delete(menuOptionId)
}

function hideOtherMenus(exceptId) {
    for (const [id, controller] of hoverControllers) {
        if (id === exceptId) continue
        controller.hideImmediate?.()
    }
}

function wireHoverBehavior(menuOption, container) {
    if (!(menuOption instanceof HTMLElement)) return
    if (!(container instanceof HTMLElement)) return

    const menuOptionId = getMenuOptionId(menuOption)
    destroyHoverController(menuOptionId)

    let hideTimer = 0
    let open = false

    const isSharedHoverTarget = (node) => {
        if (!(node instanceof Node)) return false
        return menuOption.contains(node) || container.contains(node)
    }

    const hide = () => {
        globalThis.clearTimeout(hideTimer)
        hideTimer = 0
        open = false
        container.hidden = true
        container.style.display = 'none'
        container.setAttribute('hover', 'false')
    }

    const show = () => {
        globalThis.clearTimeout(hideTimer)
        hideTimer = 0
        hideOtherMenus(menuOptionId)
        positionSecondaryContainer(container, menuOption)
        open = true
        container.hidden = false
        container.style.display = ''
        container.setAttribute('hover', 'true')
    }

    const scheduleHide = () => {
        globalThis.clearTimeout(hideTimer)
        hideTimer = globalThis.setTimeout(hide, HIDE_DELAY_MS)
    }

    const onMenuEnter = () => {
        show()
    }

    const onMenuLeave = (event) => {
        if (isSharedHoverTarget(event.relatedTarget)) return
        scheduleHide()
    }

    const onContainerEnter = () => {
        show()
    }

    const onContainerLeave = (event) => {
        if (isSharedHoverTarget(event.relatedTarget)) return
        scheduleHide()
    }

    const onWindowChange = () => {
        if (!open) return
        positionSecondaryContainer(container, menuOption)
    }

    menuOption.addEventListener('mouseenter', onMenuEnter)
    menuOption.addEventListener('mouseleave', onMenuLeave)
    menuOption.addEventListener('focusin', onMenuEnter)
    menuOption.addEventListener('focusout', (event) => {
        if (isSharedHoverTarget(event.relatedTarget)) return
        scheduleHide()
    })

    container.addEventListener('mouseenter', onContainerEnter)
    container.addEventListener('mouseleave', onContainerLeave)

    globalThis.addEventListener('resize', onWindowChange)
    globalThis.addEventListener('scroll', onWindowChange, true)

    hoverControllers.set(menuOptionId, {
        hideImmediate: hide,
        destroy() {
            globalThis.clearTimeout(hideTimer)
            menuOption.removeEventListener('mouseenter', onMenuEnter)
            menuOption.removeEventListener('mouseleave', onMenuLeave)
            menuOption.removeEventListener('focusin', onMenuEnter)
            container.removeEventListener('mouseenter', onContainerEnter)
            container.removeEventListener('mouseleave', onContainerLeave)
            globalThis.removeEventListener('resize', onWindowChange)
            globalThis.removeEventListener('scroll', onWindowChange, true)
        },
    })
}

function rebuildSecondaryList(container, items) {
    const list = container.querySelector('ul.menu-secondary')
    if (!(list instanceof HTMLElement)) return
    list.replaceChildren()
    const activeHref = currentHash()
    for (const subcategory of items) {
        list.appendChild(buildSecondaryOption(subcategory, activeHref))
    }
}

function ensureSecondaryForMenuOption(menuOption, native, items) {
    if (!(menuOption instanceof HTMLElement)) return
    hideNativeSecondaryContainers(menuOption)

    const menuOptionId = getMenuOptionId(menuOption)
    let container = findPortaledContainer(menuOptionId)
    if (!(container instanceof HTMLElement)) {
        container = buildSecondaryContainer(items)
        container.setAttribute(ANCHOR_ATTR, menuOptionId)
        wireHoverBehavior(menuOption, container)
    } else {
        const existingCount = container.querySelectorAll(
            '.menu-secondary-option',
        ).length
        if (existingCount !== items.length) {
            rebuildSecondaryList(container, items)
        }
    }

    syncActiveSecondaryOptions(container)
}

function syncActiveSecondaryOptions(scope = document) {
    const activeHref = currentHash()
    const root = scope instanceof Element || scope instanceof Document ? scope : document
    for (
        const option of root.querySelectorAll(
            `.menu-secondary-container[${MARK_ATTR}="1"] .menu-secondary-option`,
        )
    ) {
        if (!(option instanceof HTMLElement)) continue
        const href = normalizeHref(option.getAttribute('href'))
        option.classList.toggle(
            'active',
            Boolean(activeHref) && href === activeHref,
        )
    }
}

function cleanupInjectedMenuOptions() {
    document.documentElement.classList.remove('roprime-inventory-page')
    for (
        const container of document.querySelectorAll(
            `.menu-secondary-container[${MARK_ATTR}="1"]`,
        )
    ) {
        container.remove()
    }
    for (const menuOptionId of [...hoverControllers.keys()]) {
        destroyHoverController(menuOptionId)
    }
}

function syncMenuOptions() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
        cleanupInjectedMenuOptions()
        return
    }
    if (!isInventoryOrFavoritesPage()) {
        cleanupInjectedMenuOptions()
        document.documentElement.classList.remove(
            'roprime-inventory-page',
            'roprime-favorites-page',
        )
        return
    }

    document.documentElement.classList.toggle(
        'roprime-inventory-page',
        isInventoryPage(),
    )
    document.documentElement.classList.toggle(
        'roprime-favorites-page',
        isFavoritesPage(),
    )
    for (const entry of findMenuOptionsWithSecondary(document)) {
        ensureSecondaryForMenuOption(entry.menuOption, entry.native, entry.items)
    }
    syncActiveSecondaryOptions()
}

function installObserver() {
    if (observer) return
    observer = new MutationObserver(() => {
        syncMenuOptions()
    })
    const start = () => {
        if (!document.body) return
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'class', 'style'],
        })
        syncMenuOptions()
    }
    if (document.body) start()
    else document.addEventListener('DOMContentLoaded', start, { once: true })
}

export function installMenuOptions() {
    if (installed) return
    installed = true
    installObserver()
    globalThis.addEventListener('hashchange', syncMenuOptions)
    globalThis.addEventListener('popstate', syncMenuOptions)
    globalThis.addEventListener('roprime-location-change', syncMenuOptions)
    syncMenuOptions()
}

installMenuOptions()
