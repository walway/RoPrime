import { settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.js'
import { registerFeature } from '../features/registry.js'

const SECTION_CLASS = 'signup-v2-card flex flex-col bg-surface-100 radius-large padding-large'
const HEADER_CLASS = 'flex width-full flex-col items-start'
const INPUT_GROUP_CLASS =
    'foundation-web-input flex items-center width-full stroke-standard bg-none height-1000 radius-medium padding-x-medium gap-x-small stroke-contrast-alpha'
const INPUT_CLASS =
    'width-full padding-none bg-none stroke-none outline-none content-emphasis placeholder:content-muted text-body-medium placeholder:text-body-medium'
const ERROR_CLASS = 'text-caption-small content-system-alert'
const STATE_LAYER_MARKUP =
    '<div class="absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full" aria-hidden="true" data-testid="foundation-web-state-layer"></div>'
const PRESENTATION_LAYER_MARKUP =
    '<div role="presentation" class="absolute inset- transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none width-full height-full"></div>'

let observer = null

function isLoginPath(pathname = globalThis.location.pathname) {
    const path = String(pathname || '').toLowerCase()
    return (
        path === '/login' ||
        path === '/login/' ||
        /^\/[a-z]{2,3}(?:-[a-z0-9]{2,8})?\/login\/?$/i.test(path)
    )
}

function findLoginForm() {
    return (
        document.querySelector('.login-form') ||
        document.querySelector('#login-form form')
    )
}

function ensureLayer(button, markup, selector) {
    if (!(button instanceof HTMLElement)) return
    if (button.querySelector(selector)) return
    button.insertAdjacentHTML('beforeend', markup)
}

function restyleSubmitButton(loginForm) {
    const hasActiveError = Boolean(
        document.querySelector('#login-form-error, .login-error'),
    )
    const inputs = [...loginForm.querySelectorAll('input')]
    const allFilled = inputs.length > 0 && inputs.every((input) => String(input.value || '').trim())

    const nativeButton = document.getElementById('login-button') ||
        loginForm.querySelector('button[type="submit"]') ||
        loginForm.querySelector('.login-button')
    if (!(nativeButton instanceof HTMLElement)) return

    const enabled = allFilled && !hasActiveError
    nativeButton.className = enabled
        ? 'foundation-web-button relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis width-full'
        : 'foundation-web-button opacity-[0.5] relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard width-full'

    if (enabled) nativeButton.removeAttribute('disabled')
    else nativeButton.setAttribute('disabled', '')

    ensureLayer(nativeButton, PRESENTATION_LAYER_MARKUP, '[role="presentation"]')
}

function applyLoginPageRedesign() {
    if (
        !shouldRunRoPrimeOnCurrentPage() ||
        !settingsState.loginPageRedesignEnabled ||
        !isLoginPath()
    ) {
        return
    }

    const loginForm = findLoginForm()
    if (!(loginForm instanceof HTMLElement)) return

    const loginSection = document.querySelector('.section-content.login-section') ||
        document.querySelector('.signup-v2-card')
    if (loginSection instanceof HTMLElement && loginSection.className !== SECTION_CLASS) {
        loginSection.className = SECTION_CLASS
    }

    const loginHeader = document.querySelector('.login-header') ||
        document.querySelector('.signup-v2-card > h1')
    if (loginHeader instanceof HTMLElement && loginHeader.className !== HEADER_CLASS) {
        loginHeader.className = HEADER_CLASS
    }

    for (const group of loginForm.querySelectorAll(':scope > div')) {
        if (!(group instanceof HTMLElement)) continue
        if (group.tagName === 'BUTTON' || group.hasAttribute('aria-live')) continue
        if (group.className !== INPUT_GROUP_CLASS) group.className = INPUT_GROUP_CLASS
    }

    for (const input of loginForm.querySelectorAll('input')) {
        if (!(input instanceof HTMLInputElement)) continue
        if (input.className !== INPUT_CLASS) input.className = INPUT_CLASS
        if (input.dataset.roprimeLoginBound === '1') continue
        input.dataset.roprimeLoginBound = '1'
        input.addEventListener('input', () => {
            applyLoginPageRedesign()
        })
    }

    for (
        const label of loginForm.querySelectorAll(
            '.form-control-label.xsmall.text-error.login-error, #login-form-error',
        )
    ) {
        if (label instanceof HTMLElement && label.className !== ERROR_CLASS) {
            label.className = ERROR_CLASS
        }
    }

    restyleSubmitButton(loginForm)

    for (
        const altButton of document.querySelectorAll(
            '[class*="otp-login-button"], [class*="cross-device-login-button"]',
        )
    ) {
        if (!(altButton instanceof HTMLElement)) continue
        const isOtp = altButton.id === 'otp-login-button' ||
            altButton.classList.contains('otp-login-button')
        const baseIdent = isOtp ? 'otp-login-button' : 'cross-device-login-button'
        const targetClass =
            `btn-full-width btn-control-md ${baseIdent} foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-standard content-action-standard shrink-0`
        if (altButton.className !== targetClass) altButton.className = targetClass
        ensureLayer(
            altButton,
            STATE_LAYER_MARKUP,
            '[data-testid="foundation-web-state-layer"]',
        )
    }

    for (
        const secButton of document.querySelectorAll(
            '#login-form button:not(#login-button), .login-form button:not(#login-button)',
        )
    ) {
        if (!(secButton instanceof HTMLElement)) continue
        if (
            secButton.classList.contains('otp-login-button') ||
            secButton.classList.contains('cross-device-login-button')
        ) {
            continue
        }
        ensureLayer(secButton, PRESENTATION_LAYER_MARKUP, '[role="presentation"]')
    }
}

function connectObserver() {
    if (observer || !(document.documentElement instanceof HTMLElement)) return
    observer = new MutationObserver(() => {
        applyLoginPageRedesign()
    })
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    })
}

function disconnectObserver() {
    observer?.disconnect()
    observer = null
}

export function syncLoginPageRedesign() {
    if (
        !shouldRunRoPrimeOnCurrentPage() ||
        !settingsState.loginPageRedesignEnabled ||
        !isLoginPath()
    ) {
        disconnectObserver()
        return
    }
    connectObserver()
    applyLoginPageRedesign()
}

registerFeature(syncLoginPageRedesign)
