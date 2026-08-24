const OVERLAY_ATTR = "data-roprime-official-store-popup";
const STORE_URL = "https://www.amazon.com/roblox"; // no data harvesting trackers

function removeExisting() {
  document.querySelectorAll(`[${OVERLAY_ATTR}]`).forEach((node) => {
    node.remove();
  });
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "style" && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (typeof value === "boolean") {
      if (value) node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  }
  return node;
}

function stateLayer() {
  return el("div", {
    "aria-hidden": "true",
    "data-testid": "foundation-web-state-layer",
    className:
      "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none",
  });
}

function bindClose(overlay) {
  const close = () => removeExisting();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelectorAll("[data-roprime-store-close]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
  });

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKeyDown, true);
    }
  };
  document.addEventListener("keydown", onKeyDown, true);
}

export function showOfficialStorePopup() {
  removeExisting();

  const overlay = el("div", {
    [OVERLAY_ATTR]: "modern",
    "data-state": "open",
    className:
      "foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop",
    style: { pointerEvents: "auto" },
  });

  const dialog = el(
    "div",
    {
      role: "dialog",
      "aria-labelledby": "roprime-store-dialog-title",
      "data-state": "open",
      className:
        "relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high",
      "data-size": "Medium",
      tabindex: "-1",
      style: { pointerEvents: "auto" },
    },
    [
      el(
        "div",
        { className: "absolute foundation-web-dialog-close-container" },
        [
          el(
            "button",
            {
              type: "button",
              className:
                "foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle",
              "aria-label": "Close",
              "data-roprime-store-close": "1",
            },
            [
              stateLayer(),
              el("span", {
                "aria-hidden": "true",
                "data-testid": "foundation-web-icon",
                className:
                  "grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]",
              }),
            ],
          ),
        ],
      ),
      el(
        "div",
        {
          className:
            "padding-x-xlarge padding-top-xlarge padding-bottom-xlarge",
        },
        [
          el("h2", {
            id: "roprime-store-dialog-title",
            text: "You are leaving Roblox",
          }),
          el("p", {
            text: "Heads up, Robloxian – by clicking “continue,” you will be redirected to a retail website that is not owned or operated by Roblox. They may have different terms and privacy policies.",
          }),
          el("p", {
            text: "Please note that you need to be over 18 to purchase products online. We hope to see you again soon!",
          }),
        ],
      ),
      el(
        "div",
        {
          className:
            "padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end",
        },
        [
          el(
            "button",
            {
              type: "button",
              className:
                "foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-standard content-action-standard",
              style: { textDecoration: "none" },
              "data-roprime-store-close": "1",
            },
            [
              stateLayer(),
              el(
                "span",
                { className: "flex items-center min-width-0 gap-small" },
                [
                  el("span", {
                    className:
                      "padding-y-xsmall text-truncate-end text-no-wrap",
                    text: "Cancel",
                  }),
                ],
              ),
            ],
          ),
          el(
            "a",
            {
              target: "_blank",
              rel: "noreferrer",
              "aria-disabled": "false",
              href: STORE_URL,
              className:
                "foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis",
              style: { textDecoration: "none" },
              "data-roprime-store-continue": "1",
            },
            [
              stateLayer(),
              el(
                "span",
                { className: "flex items-center min-width-0 gap-small" },
                [
                  el("span", {
                    className:
                      "padding-y-xsmall text-truncate-end text-no-wrap",
                    text: "Continue",
                  }),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  bindClose(overlay);

  const continueLink = overlay.querySelector("[data-roprime-store-continue]");
  continueLink?.addEventListener("click", () => {
    window.setTimeout(removeExisting, 0);
  });
}

export function hideOfficialStorePopup() {
  removeExisting();
}
