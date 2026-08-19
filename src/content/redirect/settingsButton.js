import {
    buildPluginUrl,
    buildRoPrimeSettingsFullUrl,
    getExtensionResourceUrl,
    isExtensionContextAlive,
    isExtensionContextInvalidatedError,
    isMyAccountPath,
    isNativeMyAccountHashRoute,
    isOnRoPrimeSettingsPage,
    RP_DEFAULT_PAGE,
    RP_PARAM_KEY,
    shouldRunRoPrimeOnCurrentPage,
} from '../core/core.js'
import { openRoPrimeSettingsOnAccountPage } from '../settings/settingsPage.js'

const ROPRIME_ACCOUNT_MENU_LABEL = 'RoPrime Settings'

const TAB_ENTRY_ATTR = 'data-roprime-account-menu-entry'
const PLUGINS_TAB_ATTR = 'data-roprime-account-plugins-entry'
const POP_ENTRY_ATTR = 'data-roprime-account-popover-entry'
const DIVIDER_ATTR = 'data-roprime-account-divider'

let accountMenuRetries = 0

let accountMenuListObserver = null;
let observedAccountMenuList = null;
let reconcilingAccountMenu = false;
let accountMenuReconcileTimer = 0;

function disconnectAccountMenuListObserver() {
  if (accountMenuListObserver) {
    try {
      accountMenuListObserver.disconnect();
    } catch {
      /* ignore */
    }
  }
  observedAccountMenuList = null;
}

function queueAccountMenuReconcile() {
  if (reconcilingAccountMenu) return;
  window.clearTimeout(accountMenuReconcileTimer);
  accountMenuReconcileTimer = window.setTimeout(() => {
    accountMenuReconcileTimer = 0;
    reconcileAccountMenuTabs();
  }, 32);
}

function reconcileAccountMenuTabs() {
  if (reconcilingAccountMenu) return;
  if (!shouldInjectVerticalAccountTab()) return;
  reconcilingAccountMenu = true;
  disconnectAccountMenuListObserver();
  try {
    ensurePluginsTabEntry();
    ensureVerticalTabEntry();
  } finally {
    reconcilingAccountMenu = false;
  }
}

function ensureAccountMenuListObserver(menuList) {
  if (!(menuList instanceof HTMLElement)) return;
  if (!accountMenuListObserver) {
    accountMenuListObserver = new MutationObserver(() => {
      if (reconcilingAccountMenu) return;
      if (!shouldInjectVerticalAccountTab()) return;
      queueAccountMenuReconcile();
    });
  }
  if (observedAccountMenuList === menuList) return;
  try {
    accountMenuListObserver.observe(menuList, { childList: true });
    observedAccountMenuList = menuList;
  } catch {
    accountMenuListObserver = null;
    observedAccountMenuList = null;
  }
}

let gearMenuObserver = null
let gearMenuDebounceTimer = 0

function uninstallGearMenuObserver() {
    if (gearMenuObserver) {
        try {
            gearMenuObserver.disconnect()
        } catch {
            /* ignore */
        }
        gearMenuObserver = null
    }
    if (gearMenuDebounceTimer) {
        window.clearTimeout(gearMenuDebounceTimer)
        gearMenuDebounceTimer = 0
    }
}

function queueGearMenuPopoverReconcile() {
    if (!shouldInjectSettingsPopoverEntry()) return
    window.clearTimeout(gearMenuDebounceTimer)
    gearMenuDebounceTimer = window.setTimeout(() => {
        gearMenuDebounceTimer = 0
        injectSettingsPopoverRow()
    }, 60)
}

function installGearMenuObserver() {
    if (gearMenuObserver || !shouldInjectSettingsPopoverEntry()) return
    if (!isExtensionContextAlive()) return
    const root = document.getElementById('navigation-container') ||
        document.getElementById('navigation') ||
        document.getElementById('header') ||
        document.body
    try {
        gearMenuObserver = new MutationObserver(() => queueGearMenuPopoverReconcile())
        gearMenuObserver.observe(root, { childList: true, subtree: true })
    } catch {
        gearMenuObserver = null
    }
}

function extensionIconUrl() {
    return getExtensionResourceUrl('resources/roprime-icon.png')
}

function shouldInjectVerticalAccountTab() {
    return isNativeMyAccountHashRoute() && shouldRunRoPrimeOnCurrentPage()
}

function shouldInjectSettingsPopoverEntry() {
    return shouldRunRoPrimeOnCurrentPage() && !isMyAccountPath()
}

function getAccountPageMenuList() {
    const accountBase = document.getElementById('react-user-account-base')
    if (!(accountBase instanceof HTMLElement)) return null
    return (
        accountBase.querySelector(
            ".menu-vertical-container ul.menu-vertical[role='tablist']",
        ) || accountBase.querySelector("ul.menu-vertical[role='tablist']")
    )
}

function removePopoverInjection() {
    uninstallGearMenuObserver()
    document.querySelectorAll(`li[${POP_ENTRY_ATTR}="1"]`).forEach((n) => {
        n.remove()
    })
}

function findNativeAccountSettingsLink(ul) {
    return (
        ul.querySelector('a.rbx-menu-item[href="/my/account"]') ||
        ul.querySelector('a.rbx-menu-item[href$="/my/account"]') ||
        ul.querySelector('a.rbx-menu-item[href*="/my/account"]')
    )
}

function ensureRoPrimePopoverRowOrder(ul, li) {
    if (
        !(ul instanceof HTMLUListElement) ||
        !(li instanceof HTMLLIElement) ||
        !ul.contains(li)
    ) {
        return
    }
    const native = findNativeAccountSettingsLink(ul)
    const nativeLi = native?.closest('li')
    if (
        nativeLi instanceof HTMLLIElement &&
        ul.contains(nativeLi) &&
        nativeLi !== li
    ) {
        if (nativeLi.previousElementSibling !== li) {
            nativeLi.insertAdjacentElement('beforebegin', li)
        }
        return
    }
    if (ul.firstElementChild !== li) {
        ul.insertBefore(li, ul.firstElementChild)
    }
}

function injectSettingsPopoverRow() {
    if (!isExtensionContextAlive()) return
    if (!shouldInjectSettingsPopoverEntry()) {
        removePopoverInjection()
        return
    }

    const ul = document.getElementById('settings-popover-menu')
    if (!(ul instanceof HTMLUListElement)) return

    let li = ul.querySelector(`li[${POP_ENTRY_ATTR}="1"]`)
    if (!(li instanceof HTMLLIElement)) {
        const hrefNeedle = `?${RP_PARAM_KEY}=`
        const foreignPrime = [
            ...ul.querySelectorAll(`a.rbx-menu-item[href*="${hrefNeedle}"]`),
        ].find((node) => {
            const row = node.closest('li')
            return row instanceof HTMLLIElement && !row.hasAttribute(POP_ENTRY_ATTR)
        })
        if (foreignPrime) return

        li = document.createElement('li')
        li.setAttribute(POP_ENTRY_ATTR, '1')

        const a = document.createElement('a')
        a.className = 'rbx-menu-item'
        a.href = buildRoPrimeSettingsFullUrl()
        a.textContent = ROPRIME_ACCOUNT_MENU_LABEL

        a.addEventListener('click', (e) => {
            e.preventDefault()
            if (isMyAccountPath()) {
                openRoPrimeSettingsOnAccountPage(RP_DEFAULT_PAGE)
            } else {
                window.location.assign(buildRoPrimeSettingsFullUrl())
            }
        })

        li.appendChild(a)
        ul.appendChild(li)
    } else {
        const a = li.querySelector('a.rbx-menu-item')
        if (a instanceof HTMLAnchorElement) {
            a.href = buildRoPrimeSettingsFullUrl()
            if (a.textContent !== ROPRIME_ACCOUNT_MENU_LABEL) {
                a.textContent = ROPRIME_ACCOUNT_MENU_LABEL
            }
        }
    }

    ensureRoPrimePopoverRowOrder(ul, li)
    installGearMenuObserver()
}

function removeVerticalAccountInjections() {
  window.clearTimeout(accountMenuReconcileTimer);
  accountMenuReconcileTimer = 0;
  disconnectAccountMenuListObserver();
  accountMenuListObserver = null;
  document.querySelectorAll(`[${TAB_ENTRY_ATTR}]`).forEach((n) => {
    n.remove();
  });
  document.querySelectorAll(`[${PLUGINS_TAB_ATTR}]`).forEach((n) => {
    n.remove();
  });
  document.querySelectorAll(`li[${DIVIDER_ATTR}="1"]`).forEach((n) => {
    n.remove();
  });
}

function removeInjectedEntries() {
    removePopoverInjection()
    removeVerticalAccountInjections()
}

function navigateToRoPrimeSettings(e) {
    e.preventDefault()
    if (isMyAccountPath()) {
        openRoPrimeSettingsOnAccountPage(RP_DEFAULT_PAGE)
        return
    }
    window.location.assign(buildRoPrimeSettingsFullUrl())
}

function buildVerticalTabLi() {
    const li = document.createElement('li')
    li.classList.add('menu-option')
    li.setAttribute('role', 'tab')
    li.setAttribute(TAB_ENTRY_ATTR, '1')

    const a = document.createElement('a')
    a.href = buildRoPrimeSettingsFullUrl()
    a.classList.add('menu-option-content')
    a.style.cursor = 'pointer'
    a.style.display = 'flex'
    a.style.alignItems = 'center'
    a.addEventListener('click', navigateToRoPrimeSettings)

    const icon = document.createElement('img')
    icon.src = extensionIconUrl()
    icon.alt = ''
    icon.style.width = '15px'
    icon.style.height = '15px'
    icon.style.marginRight = '5px'
    icon.style.verticalAlign = 'middle'

    const span = document.createElement('span')
    span.classList.add('font-caption-header')
    span.textContent = ROPRIME_ACCOUNT_MENU_LABEL
    span.style.fontSize = '12px'

    a.append(icon, span)
    li.appendChild(a)
    return li
}

function createAccountMenuDividerLi() {
    const li = document.createElement('li')
    li.className = 'rbx-divider thick-height'
    li.style.width = '100%'
    li.setAttribute(DIVIDER_ATTR, '1')
    return li
}

function isThickRbxDividerLi(el) {
    return (
        el instanceof HTMLLIElement &&
        el.classList.contains('rbx-divider') &&
        el.classList.contains('thick-height')
    )
}

function getBrowserPreferencesMenuTab(menuList) {
    const link = menuList.querySelector('.menu-option a[href*="browser-preferences"]') ||
        menuList.querySelector('.menu-option a[href*="browserpreferences"]')
    const li = link?.closest('li.menu-option')
    return li instanceof HTMLElement ? li : null
}

function getOrCreatePluginDivider(menuList) {
  const natives = [
    ...menuList.querySelectorAll("li.menu-option[role='tab']"),
  ].filter(
    (li) =>
      !li.hasAttribute(TAB_ENTRY_ATTR) && !li.hasAttribute(PLUGINS_TAB_ATTR),
  );
  const anchor =
    getBrowserPreferencesMenuTab(menuList) ||
    (natives.length ? natives[natives.length - 1] : null) ||
    menuList.querySelector("li.menu-option[role='tab']");
  if (!(anchor instanceof HTMLElement)) {
    const existing = menuList.querySelector(`li[${DIVIDER_ATTR}="1"]`);
    return existing instanceof HTMLElement ? existing : null;
  }

  const existing = menuList.querySelector(`li[${DIVIDER_ATTR}="1"]`);
  if (existing instanceof HTMLElement) {
    if (anchor.nextElementSibling !== existing) {
      anchor.insertAdjacentElement("afterend", existing);
    }
    return existing;
  }

    const next = anchor.nextElementSibling
    if (isThickRbxDividerLi(next)) {
        if (next.getAttribute(DIVIDER_ATTR) !== '1') {
            next.style.width = '100%'
        }
        return next
    }

    const divider = createAccountMenuDividerLi()
    anchor.insertAdjacentElement('afterend', divider)
    return divider
}

function collapseAdjacentRbxDividers(menuList) {
    let changed = true
    while (changed) {
        changed = false
        const kids = [...menuList.children]
        for (let i = 0; i < kids.length - 1; i++) {
            const a = kids[i]
            const b = kids[i + 1]
            if (!isThickRbxDividerLi(a) || !isThickRbxDividerLi(b)) continue
            const aOurs = a.getAttribute(DIVIDER_ATTR) === '1'
            const bOurs = b.getAttribute(DIVIDER_ATTR) === '1'
            if (aOurs && bOurs) b.remove()
            else if (bOurs) b.remove()
            else if (aOurs) a.remove()
            else b.remove()
            changed = true
            break
        }
    }
}

function placeTabAfterDividerBlock(_menuList, li, divider) {
    let insertAfter = divider
    let cur = divider.nextElementSibling
    while (cur) {
        if (cur === li) {
            cur = cur.nextElementSibling
            continue
        }
        if (
            cur instanceof HTMLLIElement &&
            !cur.classList.contains('rbx-divider')
        ) {
            insertAfter = cur
        }
        cur = cur.nextElementSibling
    }
    if (insertAfter.nextElementSibling === li) return
    if (li.parentElement) li.remove()
    insertAfter.insertAdjacentElement('afterend', li)
}

function buildPluginsTabLi(menuList) {
    const li = document.createElement('li')
    li.classList.add('menu-option')
    li.setAttribute('role', 'tab')
    li.setAttribute(PLUGINS_TAB_ATTR, '1')

    const a = document.createElement('a')
    a.className = 'menu-option-content'
    a.href = '#!/plugins'
    a.style.cursor = 'pointer'
    a.addEventListener('click', (e) => {
        e.preventDefault()
        try {
            menuList.querySelectorAll('a.menu-option-content').forEach((link) => {
                if (!(link instanceof HTMLElement)) return
                link.classList.remove('active')
                link.removeAttribute('aria-current')
            })
            a.classList.add('active')
            a.setAttribute('aria-current', 'page')
        } catch {
            /* ignore */
        }
        try {
            history.replaceState(
                history.state,
                '',
                `${window.location.pathname}${window.location.search}#!/plugins`,
            )
        } catch {
            /* ignore */
        }
        if (window.location.hash !== '#!/plugins') {
            window.location.hash = '#!/plugins'
        }
        window.dispatchEvent(new Event('roprime-open-plugins-panel'))
    })

    const iconWrap = document.createElement('span')
    iconWrap.style.display = 'inline-flex'
    iconWrap.style.alignItems = 'center'
    iconWrap.style.justifyContent = 'center'
    iconWrap.style.width = '16px'
    iconWrap.style.height = '16px'
    iconWrap.style.marginRight = '8px'
    iconWrap.style.flex = '0 0 auto'
    iconWrap.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="30 732 24 20" aria-hidden="true" focusable="false" style="width:16px;height:16px;display:block;">
      <g id="my-place-on">
        <path d="M53,736h-4.4l-1.7-3.4c-0.2-0.3-0.5-0.6-0.9-0.6h-8c-0.4,0-0.7,0.2-0.9,0.6l-1.7,3.4H31c-0.6,0-1,0.4-1,1v14   c0,0.6,0.4,1,1,1h22c0.6,0,1-0.4,1-1v-14C54,736.4,53.6,736,53,736z M35,740c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1c0-0.6,0.4-1,1-1   s1,0.4,1,1V740z M44.7,738h-5.4l-2-1.3l1.3-2.7h6.8l1.3,2.7L44.7,738z M51,740c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1c0-0.6,0.4-1,1-1   s1,0.4,1,1V740z" fill="currentColor"></path>
      </g>
    </svg>
  `.trim()

    const span = document.createElement('span')
    span.classList.add('font-caption-header')
    span.textContent = 'Plugins'
    span.style.fontSize = '12px'

    a.append(iconWrap, span)
    li.appendChild(a)
    return li
}

function ensurePluginsTabEntry() {
    const menuList = getAccountPageMenuList()
    if (!(menuList instanceof HTMLElement)) return false

    const divider = getOrCreatePluginDivider(menuList)
    if (!(divider instanceof HTMLElement)) return false

    let li = menuList.querySelector(`li[${PLUGINS_TAB_ATTR}]`)
    if (!(li instanceof HTMLLIElement)) {
        li = buildPluginsTabLi(menuList)
    }

    if (divider.nextElementSibling !== li) {
        divider.insertAdjacentElement('afterend', li)
    }
    return true
}

function ensureVerticalTabEntry() {
    const menuList = getAccountPageMenuList()
    if (!(menuList instanceof HTMLElement)) return false

    let li = menuList.querySelector(`li[${TAB_ENTRY_ATTR}]`)
    const isNew = !(li instanceof HTMLLIElement)
    if (isNew) {
        li = buildVerticalTabLi()
    } else {
        const label = li.querySelector('.font-caption-header')
        if (
            label instanceof HTMLElement &&
            label.textContent !== ROPRIME_ACCOUNT_MENU_LABEL
        ) {
            label.textContent = ROPRIME_ACCOUNT_MENU_LABEL
        }
        const link = li.querySelector('a')
        if (link instanceof HTMLAnchorElement) {
            const nextHref = buildRoPrimeSettingsFullUrl()
            if (link.href !== nextHref) link.href = nextHref
        }
    }

    const divider = getOrCreatePluginDivider(menuList)
    if (!(divider instanceof HTMLElement)) {
        if (menuList.lastElementChild !== li) menuList.appendChild(li)
        return true
    }
    placeTabAfterDividerBlock(menuList, li, divider)
    collapseAdjacentRbxDividers(menuList)
    ensureAccountMenuListObserver(menuList)
    return true
}

export function syncAccountSettingsMenuButton() {
    try {
        if (!isExtensionContextAlive()) {
            return
        }

        if (!shouldRunRoPrimeOnCurrentPage()) {
            accountMenuRetries = 0
            removeInjectedEntries()
            return
        }

        if (isMyAccountPath()) {
            removePopoverInjection()
        } else {
            removeVerticalAccountInjections()
            injectSettingsPopoverRow()
        }

    let tabOk = true;
    if (shouldInjectVerticalAccountTab()) {
      reconcileAccountMenuTabs();
      tabOk = !!getAccountPageMenuList()?.querySelector(`li[${TAB_ENTRY_ATTR}]`);
    } else {
      removeVerticalAccountInjections();
    }

        if (shouldInjectVerticalAccountTab() && !tabOk && accountMenuRetries < 6) {
            accountMenuRetries += 1
            window.setTimeout(() => {
                if (!isExtensionContextAlive()) return
                syncAccountSettingsMenuButton()
            }, 450)
        } else {
            accountMenuRetries = 0
        }
    } catch (e) {
        if (isExtensionContextInvalidatedError(e)) {
            return
        }
        throw e
    }
}
