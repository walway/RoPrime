import { settingsState, shouldRunRoPrimeOnCurrentPage } from '../core/core.ts'
import { registerFeature } from '../features/registry.ts'

const CLASSIC_ICO_HREF =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MTkiIGhlaWdodD0iNzU1IiBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNzE5IDc1NSI+PHBhdGggZmlsbD0iI2U0MjcyNyIgZD0ibTE2NC4wMzggMzI4LjU3NC0xMS41NjMtMTYxLjQ2MmM3My41MTktMS4xNTMgMTQ2LjgwOCA0LjQ0IDIyMC4wNjkgOC42NDlsNS45MjUgMi43MDktMS40MzggMTMxLjUzOXpNMzM2LjU5IDIxMC4zNTNsLTE0My44NDctOC42NzdjLjIzMSA1LjI3Ni0uMzQ1IDEwLjY5NS0uMTE1IDE1Ljk5OS43NzcgMTcuNDk5IDIuOTM0IDQ2LjQ5OSA1Ljg2OCA2My4zMDUuNTc1IDMuMzE1IDEuMDA3IDUuODIzIDQuNzE3IDYuODAzbDEzMy4zNDgtMTEuMTI3di02Ni4zMDN6Ii8+PHBhdGggZmlsbD0iI2U0MjcyNyIgZD0iTTU2Ny45OTIgMGMxMS42NzggMi4xOSAyMS44ODkgMjguNzEyIDI2Ljk4MSAzOS4yNjMgMTcuOTkyIDM3LjE1NyAzMS4yNTggNzYuNTQ1IDQ2LjQ2MSAxMTQuOTU1IDE1LjYgNDcuNDQ0IDI0LjMwMyA3Ni41NTUgMzYuNTM4IDEyMC41MzcuODY0IDMuNTg2IDEuOTcxIDcuNDY5IDMuMTg3IDExLjQ5OHEuMjY3Ljk2MS41MzUgMS45MzRsLjIxOS41NDFjNS4yODggMTcuMTg1IDEyLjA4MyAzNi40MDggMTAuNzcgNDYuMzYxLS44OTIgNi44MzItMTIuMTEgMjAuNDEtMTYuNzcgMjYuNDkyLTcuNjE5IDkuOTIyLTI4LjIzMiAyOC4xMTgtMzYuNjgzIDM5LjQ0My0xOC40MjYgMTkuOTA3LTMzLjcxNCAyOC4wMjYtNTguMjExIDMxLjQxNWwuMDAzLS4wM2MtNTQuMTA0IDMuNjktMTA4LjQwOSA1LjA0Ni0xNjIuNTcxIDguNjItNC4yODYuMjg5LTEwLjAwOS0uMDU4LTcuMTA0IDQuMjk1bDMwMy4yMjQgMjY2Ljg1NWMzLjQzMSAzLjU5OCA0LjE3NiA2LjI4NyA0LjQzIDEwLjAwMy0uMjU5IDEyLjgyOC0zNC4yMjkgMTQuMDEtNDQuODcxIDE1LjQyMi04Mi43NTMgMTEuMDEzLTIxMS4zODMgMjIuNTE1LTI5My4xMjkgMTQuODc1LTEwLjQ3LS45OC0xOS42NDUtMy40ODgtMjcuMjY4LTEwLjk1NWwtMTUxLjQxMS0yOTQuMjQtMTUuMzU5LS40NjFjMTQuMDM2IDYxLjgzNSAzMi42NzUgMTIzLjAzNSA1MC45OTcgMTgzLjgwMyA0LjQ1OCAxNC43NTkgMzUuNzUzIDEwMi43OTcgMzQuNzE4IDEwOC4zOTEtMS45NTYgMTAuNzIzLTI5LjQ4MyA4LjAxMy0zOC40IDcuNzI1LTM2LjgxNy0xLjI5Ny04My4yNDEtNy4yNjQtMTIwLjMxNy0xMi4wMi0xNy4zNzMtMi4yMi02My45OTktNi41NDQtNzcuMjU5LTExLjkzNS02LjUzLTIuNjUyLTEwLjktOS4xOTYtMTMuMDg3LTE1LjcxMS03LjAxOC0xMzAuNDcyLTE5LjA3LTI2MC43NDMtMjAuNjgxLTM5MS40NzRDMi44NzYgMzEwLjczIDEuNDM4IDE0OS43NTggMCAxNDEuMTY3di02My40MmMwLTIuODgzIDguOTQ2LTUuNzY1IDE0LjI5Ni03LjI5MyAzMS4zOC05LjExIDc1LjU5LTE0LjkwMyAxMDguNzgzLTIwLjY2OUMyNjkuMzk5IDI0LjM2IDQxOS41MTUgNi4xOTggNTY3Ljk5MiAwbS0yMi44OTUgNDMuMTI2Yy0xNzAuMTY1IDE0LjcwMi0zMzkuNTgyIDM2LjEyLTUwNy40NzQgNjYuNDc2bDMxLjk1NiA1NjguNzMzIDQuMDU2IDQuNTg0IDEzOS4yNzIgMTcuNDk4LTY3Ljg4Mi0yNzYuNTY5Yy0uNjcxLTMuNjk1LS4zMjktNS4yMjYgMy4xNjQtNS45MzloNzEuOTFjLjYwNC0uMDAxIDEuOTU2LTIuMjc3IDQuMzE0LTEuNDQxbDE3MS40MyAyODkuNDI3YzEyLjU5OCAzLjE3IDM0LjgwMy40MzEgNDguNDk1LjE0MyAyNi44OTQtLjU0OCA1My44NzUuNTc3IDgwLjc2OC4yMzFsOTkuMTItOC43OTItMzAxLjk4OS0yODMuOTIgMjYyLjU1My0xOS4zNDNjMTAuOTg4LTIuNDUgNTUuNi00OS43NTcgNjAuMzE3LTYwLjcxMSA0LjQwMS0xMC4yMzQtOS40MDUtNTUuMTE4LTEzLjA1OC02OS4wMTMtMTkuNzYxLTc1LjAwOC00Ny42OS0xNDkuMDY1LTgwLjk0MS0yMTguNzEyeiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xNDguMTg4IDQxNy45MTFjLTMuMTQuNTUzLTMuNjgxIDEuOTg3LTMuMTY0IDUuOTM4bDY3Ljg4MSAyNzYuNTY5TDczLjYzMyA2ODIuOTJsLTQuMDU2LTQuNTg0LTMxLjk4NS01NjguNzMzYzE2Ny45MjEtMzAuMzU1IDMzNy4zMDktNTEuNzc0IDUwNy40NzQtNjYuNDc2bDYuMDEyIDIuNjUyYzMzLjI1IDY5LjYxOCA2MS4yMDggMTQzLjcwNCA4MC45NCAyMTguNzEzIDMuNjUzIDEzLjg5NCAxNy40ODggNTguNzc5IDEzLjA1OSA2OS4wMTItNC43MTcgMTAuOTU1LTQ5LjMzIDU4LjI2LTYwLjMxNyA2MC43MTFsLTI2Mi41NTMgMTkuMzQzIDMwMS45ODggMjgzLjkyLTk5LjExOSA4Ljc5MmMtMjYuODk0LjMxNy01MC45MS44MDYtNzcuODA0IDEuMzU0LTEzLjY5MS4yODgtMzcuMzkyIDEuNDQyLTUxLjQ2LTEuNzI5TDIyNC4zNTUgNDE5LjM1MWMtMS40MzgtMS40NDEtMy42ODMtMS40NC00LjI4Ny0xLjQ0aC03MS45MDl6bTE1Ljg0OC04OS4zMzZMMzc3LjAzIDMxMC4wMWwxLjQzOC0xMzEuNTM5LTUuOTI1LTIuNzFjLTczLjI2MS00LjE4LTE0Ni41NS05LjgwMS0yMjAuMDctOC42NDh6Ii8+PC9zdmc+'
const DEFAULT_ICO_HREF = 'https://images.rbxcdn.com/e854eb7b2951ac03edba9a2681032bba.ico'

let observer = null
let syncing = false

function preferredHref() {
    const classic = document.body instanceof HTMLElement &&
        document.body.classList.contains('classic-theme')
    return classic ? CLASSIC_ICO_HREF : DEFAULT_ICO_HREF
}

function manageFaviconState() {
    if (syncing) return
    syncing = true
    try {
        observer?.disconnect()
        const chosenHref = preferredHref()
        const existing = document.querySelectorAll(
            'link[rel*="icon"], link[rel="apple-touch-icon"]',
        )
        let matching = false
        for (const link of existing) {
            if (!(link instanceof HTMLLinkElement)) continue
            if (link.href === chosenHref) matching = true
            else link.remove()
        }
        if (!matching) {
            const host = document.head || document.documentElement
            const icon = document.createElement('link')
            icon.rel = 'icon'
            icon.href = chosenHref
            const apple = document.createElement('link')
            apple.rel = 'apple-touch-icon'
            apple.href = chosenHref
            host.append(icon, apple)
        }
    } finally {
        syncing = false
        startObserving()
    }
}

function startObserving() {
    if (!(document.documentElement instanceof HTMLElement)) return
    if (!observer) {
        observer = new MutationObserver(() => {
            const expected = preferredHref()
            const current = document.querySelector(
                'link[rel*="icon"], link[rel="apple-touch-icon"]',
            )
            if (
                !(current instanceof HTMLLinkElement) ||
                current.getAttribute('href') !== expected
            ) {
                manageFaviconState()
            }
        })
    }
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'rel', 'class'],
    })
}

export function syncClassicIcon() {
    if (!shouldRunRoPrimeOnCurrentPage()) {
        observer?.disconnect()
        return
    }
    // Classic Icon Favicon is enabled by default
    void settingsState
    manageFaviconState()
}

registerFeature(syncClassicIcon)
