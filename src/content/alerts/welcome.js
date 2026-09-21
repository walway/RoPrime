import { appendParsedMarkup } from '../ui/dom.js'
import { getExtensionResourceUrl, getStorageApi, isExtensionContextInvalidatedError } from '../core/core.js'
import { getRobloxUserId } from '../profile/robloxUserId.js'

export const RP_HOME_WELCOME_DISMISSED_KEY = 'rpHomeWelcomeDismissed'

const WELCOME_ROOT_ID = 'roprime-home-welcome-root'
const CURRENCY_API = 'https://economy.roblox.com/v1/user/currency'
const HEADSHOT_API = 'https://thumbnails.roblox.com/v1/users/avatar-headshot'
const USER_API = 'https://users.roblox.com/v1/users'
const POPOVER_BASE_CLASS = 'fade popover bottom roprime-welcome-preview-popover'
const POPOVER_OPEN_CLASS = 'fade in popover bottom roprime-welcome-preview-popover'
const extensionApi = globalThis.browser || globalThis.chrome

let welcomeKeydownHandler = null
let storageDismissListenerAttached = false
let welcomeDismissedCache = null

function attachDismissStorageListener() {
    if (storageDismissListenerAttached) return
    if (!extensionApi?.storage?.onChanged) return
    storageDismissListenerAttached = true
    extensionApi.storage.onChanged.addListener((changes, area) => {
        try {
            if (area !== 'local') return
            if (changes[RP_HOME_WELCOME_DISMISSED_KEY]?.newValue === true) {
                welcomeDismissedCache = true
                removeWelcomeIfPresent()
            }
        } catch (error) {
            if (!isExtensionContextInvalidatedError(error)) throw error
        }
    })
}

export function isRobloxHomePage() {
    const raw = globalThis.location.pathname || '/'
    const normalized = raw.replace(/\/+$/, '') || '/'
    if (normalized === '/home') return true
    const parts = normalized.split('/').filter(Boolean)
    return parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'home'
}

function removeWelcomeIfPresent() {
    if (welcomeKeydownHandler) {
        document.removeEventListener('keydown', welcomeKeydownHandler, true)
        welcomeKeydownHandler = null
    }
    document.getElementById(WELCOME_ROOT_ID)?.remove()
}

function appendWelcomeWhenBodyReady(root) {
    const mount = () => {
        if (!document.body) return false
        document.body.appendChild(root)
        return true
    }
    if (mount()) return

    const observer = new MutationObserver(() => {
        if (!isRobloxHomePage()) {
            observer.disconnect()
            return
        }
        if (mount()) observer.disconnect()
    })
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    })
}

function persistWelcomeDismissed() {
    welcomeDismissedCache = true
    try {
        const storage = getStorageApi()
        if (storage) storage.set({ [RP_HOME_WELCOME_DISMISSED_KEY]: true })
    } catch {
        /* ignore */
    }
}

function formatUsd(robux) {
    const amount = Math.max(0, Number(robux) || 0) * 0.0125
    return amount.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

function parseAgeBracketFromPage() {
    const labels = document.querySelectorAll('body .age-bracket-label')
    for (const label of labels) {
        if (!(label instanceof HTMLElement)) continue
        if (label.closest(`#${WELCOME_ROOT_ID}`)) continue
        const name = String(
            label.querySelector('.age-bracket-label-username')?.textContent || '',
        ).trim()
        const img = label.querySelector(
            '.thumbnail-2d-container.avatar-card-image img, .avatar-card-image img, img',
        )
        let headshot = ''
        if (img instanceof HTMLImageElement) {
            headshot = String(img.currentSrc || img.src || '').trim()
            if (!headshot || headshot.startsWith('data:')) headshot = ''
        }
        if (name || headshot) return { name, headshot }
    }
    return { name: '', headshot: '' }
}

function waitForAgeBracket(timeoutMs = 8000) {
    const existing = parseAgeBracketFromPage()
    if (existing.name || existing.headshot) return Promise.resolve(existing)

    return new Promise((resolve) => {
        let done = false
        const finish = (value) => {
            if (done) return
            done = true
            observer.disconnect()
            globalThis.clearTimeout(timer)
            resolve(value)
        }

        const observer = new MutationObserver(() => {
            const next = parseAgeBracketFromPage()
            if (next.name || next.headshot) finish(next)
        })
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'class'],
        })

        const timer = globalThis.setTimeout(() => {
            finish(parseAgeBracketFromPage())
        }, timeoutMs)
    })
}

async function fetchProfileFromApi() {
    const userId = await getRobloxUserId()
    if (!userId) return { name: '', headshot: '' }
    let name = ''
    let headshot = ''
    try {
        const userRes = await fetch(`${USER_API}/${userId}`, {
            credentials: 'include',
        })
        if (userRes.ok) {
            const data = await userRes.json()
            name = String(data?.displayName || data?.name || '').trim()
        }
    } catch {
        /* ignore */
    }
    try {
        const thumbRes = await fetch(
            `${HEADSHOT_API}?userIds=${encodeURIComponent(String(userId))}&size=150x150&format=Png&isCircular=false`,
            { credentials: 'include' },
        )
        if (thumbRes.ok) {
            const data = await thumbRes.json()
            headshot = String(data?.data?.[0]?.imageUrl || '').trim()
        }
    } catch {
        /* ignore */
    }
    return { name, headshot }
}

async function fetchRobuxBalance() {
    try {
        const currencyRes = await fetch(CURRENCY_API, { credentials: 'include' })
        if (!currencyRes.ok) return 0
        const data = await currencyRes.json()
        const value = Number(data?.robux)
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
    } catch {
        return 0
    }
}

function setPopoverOpen(popover, open) {
    if (!(popover instanceof HTMLElement)) return
    popover.className = open ? POPOVER_OPEN_CLASS : POPOVER_BASE_CLASS
    const key = popover.getAttribute('data-roprime-welcome-popover')
    if (key) popover.setAttribute('data-roprime-welcome-popover', key)
    if (popover.id) {
        /* ignore */
    }
    popover.style.display = open ? 'block' : 'none'
}

function closeAllPreviewPopovers(preview, except = null) {
    for (
        const popover of preview.querySelectorAll(
            '.roprime-welcome-preview-popover',
        )
    ) {
        if (popover === except) continue
        setPopoverOpen(popover, false)
    }
}

function buildWelcomeMarkup(verityUrl) {
    const veritySrc = verityUrl || ''
    return `
<div data-state="open" class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;" data-roprime-welcome-dismiss="backdrop">
  <div role="dialog" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high" data-size="Medium" tabindex="-1" style="pointer-events: auto;">
    <div class="absolute foundation-web-dialog-close-container">
      <button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle roprime-welcome-close" aria-label="Close">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"></span>
      </button>
    </div>
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge">
      <h2 id="roprime-welcome-title">Welcome to RoPrime!</h2>
      <p>Quick reminder - you can open RoPrime Settings by clicking the Gear icon at the right-top side of the Roblox website.</p>
      <div class="roprime-welcome-preview-frame">
        <div class="wrap no-gutter-ads logged-in left-nav-new-width">
          <div class="builder-font">
            <div class="navbar-fixed-top rbx-header" role="navigation">
              <div class="container-fluid">
                <div id="right-navigation-header">
                  <div class="navbar-right rbx-navbar-right">
                    <ul class="nav navbar-right rbx-navbar-icon-group roprime-welcome-preview-nav">
                      <div class="age-bracket-label text-header" style="user-select:none;">
                        <a class="dynamic-overflow-container" style="cursor:default;">
                          <span class="avatar avatar-headshot-xs">
                            <span class="thumbnail-2d-container shimmer avatar-card-image" data-roprime-welcome-avatar-wrap></span>
                          </span>
                          <span class="text-overflow age-bracket-label-username font-caption-header" data-roprime-welcome-name></span>
                        </a>
                      </div>
                      <li class="rbx-navbar-right-search">
                        <button type="button" class="rbx-menu-item btn-navigation-nav-search-white-md" aria-label="Search" tabindex="-1">
                          <span class="icon-nav-search-white" aria-hidden="true"></span>
                        </button>
                      </li>
                      <li class="navbar-icon-item navbar-stream notification-margins" data-roprime-welcome-popover-host="notifications">
                        <button type="button" class="btn-uiblox-common-common-notification-bell-md" aria-label="Notifications" aria-haspopup="true" data-roprime-welcome-popover-trigger="notifications">
                          <span class="nav-robux-icon rbx-menu-item">
                            <span class="icon-common-notification-bell"></span>
                          </span>
                        </button>
                        <div id="notification-stream-popover" class="${POPOVER_BASE_CLASS}" data-roprime-welcome-popover="notifications" role="tooltip" style="display:none; top:38px; left:20px;">
                          <div class="arrow"></div>
                          <div class="popover-content">
                            <div class="new-notification-stream-2022">
                              <div class="notification-content-view">
                                <div class="notification-stream-header">
                                  <span class="text-label font-caption-header">Notifications</span>
                                </div>
                                <div class="notification-stream-body">
                                  <div class="container-empty roprime-welcome-verity-empty">
                                    <img class="roprime-welcome-verity" data-roprime-welcome-verity alt="" ${
        veritySrc ? `src="${veritySrc}"` : ''
    } />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                      <li class="navbar-icon-item" data-roprime-welcome-popover-host="robux" data-roprime-welcome-robux-item hidden>
                        <button type="button" class="btn-navigation-nav-robux-md" aria-label="Robux" aria-haspopup="true" data-roprime-welcome-popover-trigger="robux">
                          <span class="nav-robux-icon rbx-menu-item">
                            <span class="icon-robux-28x28 roblox-popover-close"></span>
                            <span class="rbx-text-navbar-right text-header" id="nav-robux-amount" data-roprime-welcome-robux></span>
                          </span>
                        </button>
                        <div id="buy-robux-popover" class="${POPOVER_BASE_CLASS}" data-roprime-welcome-popover="robux" role="tooltip" style="display:none; top:38px; left:26px;">
                          <div class="arrow"></div>
                          <div class="popover-content">
                            <ul id="buy-robux-popover-menu" class="dropdown-menu">
                              <div class="wallet">
                                <li class="dropdown-wallet">
                                  <a class="dropdown-wallet-section">
                                    <span class="icon-robux-28x28"></span>
                                    <span id="nav-robux-balance">
                                      <span data-roprime-welcome-robux></span><span class="text-label" style="font-size:12px; margin:auto 0 auto 5px;" data-roprime-welcome-usd></span>
                                    </span>
                                  </a>
                                </li>
                                <li class="rbx-divider"></li>
                              </div>
                              <li class="rbx-menu-item-container"><a class="rbx-menu-item"><span class="buy-robux-link-container">Buy Robux</span></a></li>
                              <li><a class="rbx-menu-item">My Transactions</a></li>
                              <li><a class="rbx-menu-item">Redeem Roblox Codes</a></li>
                            </ul>
                          </div>
                        </div>
                      </li>
                      <li class="navbar-icon-item" data-roprime-welcome-popover-host="settings">
                        <button type="button" class="btn-navigation-nav-settings-md" aria-label="Settings" aria-haspopup="true" data-roprime-welcome-popover-trigger="settings">
                          <span class="nav-settings-icon rbx-menu-item" aria-hidden="true">
                            <span class="icon-nav-settings roblox-popover-close"></span>
                          </span>
                        </button>
                        <div class="${POPOVER_OPEN_CLASS}" data-roprime-welcome-popover="settings" role="tooltip" style="display:block; top:38px; left:20px;">
                          <div class="arrow"></div>
                          <div class="popover-content">
                            <ul id="preview-settings-popover-menu" class="dropdown-menu">
                              <li class="roprime-dropdown-entry">
                                <a class="rbx-menu-item roprime-welcome-settings-link" style="display:inline-flex; align-items:center; gap:8px;" href="https://www.roblox.com/my/account?roprime=info#!/info">
                                  <img data-roprime-welcome-icon alt="" width="14" height="14" style="display:block; flex-shrink:0;" />
                                  <span>RoPrime Settings</span>
                                </a>
                              </li>
                              <li><a class="rbx-menu-item">Settings</a></li>
                              <li><a class="rbx-menu-item">Quick Sign In</a></li>
                              <li><a class="rbx-menu-item">Help &amp; Safety</a></li>
                              <li><a class="rbx-menu-item">Switch Accounts</a></li>
                              <li><a class="rbx-menu-item">Logout</a></li>
                            </ul>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p>We hope you will enjoy our extension and will rate us 5 stars on store!</p>
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end">
      <button type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis roprime-welcome-ok">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">Let's go!</span>
        </span>
      </button>
    </div>
  </div>
</div>
`
}

function wireWelcomePreview(root) {
    const preview = root.querySelector('.roprime-welcome-preview-frame')
    if (!(preview instanceof HTMLElement)) return

    preview.addEventListener('click', (event) => {
        const settingsLink = event.target?.closest?.(
            'a.roprime-welcome-settings-link',
        )
        if (settingsLink instanceof HTMLAnchorElement) {
            persistWelcomeDismissed()
            return
        }

        const trigger = event.target?.closest?.(
            '[data-roprime-welcome-popover-trigger]',
        )
        if (!(trigger instanceof HTMLElement)) return
        event.preventDefault()
        event.stopPropagation()
        const key = trigger.getAttribute('data-roprime-welcome-popover-trigger')
        const popover = preview.querySelector(
            `[data-roprime-welcome-popover="${key}"]`,
        )
        if (!(popover instanceof HTMLElement)) return
        const willOpen = !popover.classList.contains('in')
        closeAllPreviewPopovers(preview, willOpen ? popover : null)
        setPopoverOpen(popover, willOpen)
    })
}

function applyAvatar(wrap, headshot, name) {
    if (!(wrap instanceof HTMLElement)) return
    wrap.textContent = ''
    wrap.classList.add('thumbnail-2d-container', 'avatar-card-image')
    if (!headshot) {
        wrap.classList.add('shimmer')
        return
    }

    wrap.classList.add('shimmer')
    const img = document.createElement('img')
    img.alt = name || ''
    img.decoding = 'async'
    const reveal = () => {
        wrap.classList.remove('shimmer')
    }
    img.addEventListener('load', reveal, { once: true })
    img.addEventListener('error', reveal, { once: true })
    // If cached, load may have already fired before listeners.
    img.src = headshot
    wrap.appendChild(img)
    if (img.complete && img.naturalWidth > 0) reveal()
}

async function hydrateWelcomePreview(root) {
    const avatarWrap = root.querySelector('[data-roprime-welcome-avatar-wrap]')
    if (avatarWrap instanceof HTMLElement) {
        avatarWrap.classList.add(
            'thumbnail-2d-container',
            'shimmer',
            'avatar-card-image',
        )
        avatarWrap.textContent = ''
    }

    let fromPage = await waitForAgeBracket(6000)
    let name = fromPage.name || ''
    let headshot = fromPage.headshot || ''

    if (!name || !headshot) {
        const fromApi = await fetchProfileFromApi()
        name = name || fromApi.name
        headshot = headshot || fromApi.headshot
    }

    // Age-bracket img can appear after the username — one more pass.
    if (!headshot) {
        fromPage = parseAgeBracketFromPage()
        headshot = fromPage.headshot || headshot
        name = name || fromPage.name
    }

    for (const node of root.querySelectorAll('[data-roprime-welcome-name]')) {
        node.textContent = name
    }

    applyAvatar(avatarWrap, headshot, name)

    const robuxItem = root.querySelector('[data-roprime-welcome-robux-item]')
    if (!(robuxItem instanceof HTMLElement)) return

    robuxItem.hidden = true
    const robux = await fetchRobuxBalance()
    if (robux <= 0) {
        robuxItem.hidden = true
        return
    }

    robuxItem.hidden = false
    for (const node of root.querySelectorAll('[data-roprime-welcome-robux]')) {
        node.textContent = String(robux)
    }
    const usdNode = root.querySelector('[data-roprime-welcome-usd]')
    if (usdNode instanceof HTMLElement) {
        usdNode.textContent = `(${formatUsd(robux)})`
    }
    const robuxBtn = robuxItem.querySelector('button')
    if (robuxBtn instanceof HTMLElement) {
        robuxBtn.setAttribute('aria-label', `Robux: ${robux}`)
    }
}

function showWelcomeModal() {
    if (document.getElementById(WELCOME_ROOT_ID)) return

    const root = document.createElement('div')
    root.id = WELCOME_ROOT_ID
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-modal', 'true')
    root.setAttribute('aria-labelledby', 'roprime-welcome-title')

    const iconUrl = getExtensionResourceUrl('resources/roprime-icon.png') || ''
    const verityUrl = getExtensionResourceUrl('resources/badges/memes/Verity.webp') || ''
    appendParsedMarkup(root, buildWelcomeMarkup(verityUrl))

    const iconImg = root.querySelector('[data-roprime-welcome-icon]')
    if (iconImg instanceof HTMLImageElement && iconUrl) {
        iconImg.src = iconUrl
    }
    const verityImg = root.querySelector('[data-roprime-welcome-verity]')
    if (verityImg instanceof HTMLImageElement && verityUrl) {
        verityImg.src = verityUrl
    }

    wireWelcomePreview(root)
    void hydrateWelcomePreview(root)

    const dismiss = () => {
        persistWelcomeDismissed()
        removeWelcomeIfPresent()
    }

    root.querySelector('.roprime-welcome-ok')?.addEventListener('click', dismiss)
    root
        .querySelector('.roprime-welcome-close')
        ?.addEventListener('click', dismiss)
    root
        .querySelector("[data-roprime-welcome-dismiss='backdrop']")
        ?.addEventListener('click', (event) => {
            if (event.target === event.currentTarget) dismiss()
        })

    welcomeKeydownHandler = (event) => {
        if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', welcomeKeydownHandler, true)

    appendWelcomeWhenBodyReady(root)
}

export function syncHomeWelcomeModal() {
    attachDismissStorageListener()
    if (!isRobloxHomePage()) {
        removeWelcomeIfPresent()
        return
    }

    if (welcomeDismissedCache === true) {
        removeWelcomeIfPresent()
        return
    }
    if (welcomeDismissedCache === false) {
        showWelcomeModal()
        return
    }

    const storage = getStorageApi()
    if (!storage) {
        welcomeDismissedCache = false
        showWelcomeModal()
        return
    }

    try {
        storage.get([RP_HOME_WELCOME_DISMISSED_KEY], (result) => {
            try {
                if (extensionApi?.runtime?.lastError) {
                    if (isRobloxHomePage()) showWelcomeModal()
                    return
                }
                if (!isRobloxHomePage()) return
                if (result?.[RP_HOME_WELCOME_DISMISSED_KEY] === true) {
                    welcomeDismissedCache = true
                    removeWelcomeIfPresent()
                    return
                }
                welcomeDismissedCache = false
                showWelcomeModal()
            } catch {
                /* ignore */
            }
        })
    } catch {
        if (isRobloxHomePage()) showWelcomeModal()
    }
}
