import { getExtensionResourceUrl } from '../core/core.js'

const OVERLAY_ROOT_ID = 'roprime-overlay-root'

let activeOverlayPromise = null
let activeOverlayKeydownHandler = null

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

function removeOverlayIfPresent() {
    if (activeOverlayKeydownHandler) {
        document.removeEventListener('keydown', activeOverlayKeydownHandler, true)
        activeOverlayKeydownHandler = null
    }
    document.getElementById(OVERLAY_ROOT_ID)?.remove()
}

function appendOverlayWhenBodyReady(root) {
    const mount = () => {
        if (!document.body) return false
        document.body.appendChild(root)
        return true
    }
    if (mount()) return

    const observer = new MutationObserver(() => {
        if (mount()) observer.disconnect()
    })
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    })
}

function buildOverlayMarkup({
    headerName,
    iconUrl,
    heading,
    description,
    buttonText,
}) {
    const iconMarkup = iconUrl
        ? `<img class="roprime-overlay-icon-img" src="${escapeHtml(iconUrl)}" alt="" />`
        : `<div class="app-icon-bluebg app-icon-windows size-1600" role="img" aria-label="App Icon"></div>`

    return `
<div
  data-state="open"
  class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop roprime-overlay-backdrop"
  style="pointer-events: auto;"
>
  <div
    role="dialog"
    aria-labelledby="roprime-overlay-heading"
    data-state="open"
    class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high download-dialog"
    data-size="Medium"
    tabindex="-1"
    style="pointer-events: auto;"
  >
    <div class="roprime-overlay-header">
      <img src="${escapeHtml(getExtensionResourceUrl('resources/roprime-icon.png'))}" alt="" />
      <h2>${escapeHtml(headerName)}</h2>
      <div class="absolute foundation-web-dialog-close-container">
        <button
          type="button"
          class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle roprime-overlay-close"
          aria-label="Close"
        >
          <div
            role="presentation"
            class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"
          ></div>
          <span
            role="presentation"
            class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"
          ></span>
        </button>
      </div>
    </div>
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge flex flex-col items-center gap-xlarge">
      ${iconMarkup}
      <h2
        id="roprime-overlay-heading"
        class="text-heading-small padding-x-xxlarge padding-y-none text-align-x-center flex flex-col"
      >
        ${escapeHtml(heading)}
      </h2>
      ${
        description
            ? `<p class="text-body-medium padding-x-xxlarge padding-y-none text-align-x-center roprime-overlay-description">${
                escapeHtml(description)
            }</p>`
            : ''
    }
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex">
      <button
        type="button"
        class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis grow roprime-overlay-action"
        style="text-decoration: none;"
      >
        <div
          role="presentation"
          class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"
        ></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">
            ${escapeHtml(buttonText)}
          </span>
        </span>
      </button>
    </div>
  </div>
</div>
`.trim()
}

export function showRoPrimeOverlay({
    headerName = 'RoPrime',
    iconUrl = '',
    heading = '',
    description = '',
    buttonText = 'Ok',
    onAction = null,
} = {}) {
    if (activeOverlayPromise) return activeOverlayPromise

    activeOverlayPromise = new Promise((resolve) => {
        removeOverlayIfPresent()

        const root = document.createElement('div')
        root.id = OVERLAY_ROOT_ID
        root.setAttribute('role', 'dialog')
        root.setAttribute('aria-modal', 'true')
        root.setAttribute('aria-labelledby', 'roprime-overlay-heading')
        root.innerHTML = buildOverlayMarkup({
            headerName,
            iconUrl,
            heading,
            description,
            buttonText,
        })

        const close = (accepted) => {
            removeOverlayIfPresent()
            activeOverlayPromise = null
            resolve(accepted)
        }

        root
            .querySelector('.roprime-overlay-action')
            ?.addEventListener('click', async () => {
                let result = true
                if (typeof onAction === 'function') {
                    try {
                        result = await onAction()
                    } catch {
                        result = false
                    }
                }
                close(result)
            })
        root
            .querySelector('.roprime-overlay-close')
            ?.addEventListener('click', () => {
                close(false)
            })
        root
            .querySelector('.roprime-overlay-backdrop')
            ?.addEventListener('click', (event) => {
                if (event.target === event.currentTarget) close(false)
            })

        activeOverlayKeydownHandler = (event) => {
            if (event.key === 'Escape') close(false)
        }
        document.addEventListener('keydown', activeOverlayKeydownHandler, true)

        appendOverlayWhenBodyReady(root)
    })

    return activeOverlayPromise
}

export function showMaliciousPluginOverlay(pluginName, onDelete) {
    const name = String(pluginName || 'Extension').trim() || 'Extension'
    return showRoPrimeOverlay({
        headerName: 'RoPrime Security System',
        heading: `${name} is a malicious extension`,
        description: 'This extension has been flagged as malicious. Click below to remove it from your browser.',
        buttonText: 'Click to delete the extension',
        onAction: onDelete,
    })
}
