const OVERLAY_ATTR = "data-roprime-official-store-popup-legacy";
const STORE_URL = "https://www.amazon.com/roblox";

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

export function showOfficialStorePopupLegacy() {
  removeExisting();

  const overlay = el("div", {
    [OVERLAY_ATTR]: "1",
    "data-state": "open",
    className:
      "foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop",
    style: { pointerEvents: "auto" },
  });

  const dialog = el(
    "div",
    {
      role: "dialog",
      "aria-labelledby": "roprime-store-legacy-title",
      "data-state": "open",
      className:
        "relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high modal-dialog modal-window",
      "data-size": "Medium",
      tabindex: "-1",
      style: {
        background: "none",
        borderWidth: "medium",
        borderStyle: "none",
        borderColor: "currentcolor",
        borderImage: "none",
        pointerEvents: "auto",
      },
    },
    [
      el("div", { className: "modal-content" }, [
        el("div", { className: "modal-header" }, [
          el(
            "button",
            {
              type: "button",
              className: "close",
              title: "close",
              "data-roprime-store-close": "1",
            },
            [el("span", { className: "icon-close" })],
          ),
          el("h4", {
            className: "modal-title",
            id: "roprime-store-legacy-title",
            text: "You are leaving Roblox",
          }),
        ]),
        el("div", { className: "modal-body" }, [
          el("p", {
            className: "shop-description",
            text: "Heads up, Robloxian – by clicking “continue,” you will be redirected to a retail website that is not owned or operated by Roblox. They may have different terms and privacy policies.",
          }),
          el("p", {
            className: "shop-warning",
            text: "Please note that you need to be over 18 to purchase products online. We hope to see you again soon!",
          }),
        ]),
        el("div", { className: "modal-footer" }, [
          el("div", { className: "loading" }),
          el("div", { className: "modal-buttons" }, [
            el("button", {
              type: "button",
              className: "modal-button btn-primary-md btn-min-width",
              "data-roprime-store-continue": "1",
              text: "Continue",
            }),
            el("button", {
              type: "button",
              className: "modal-button btn-control-md btn-min-width",
              "data-roprime-store-close": "1",
              text: "Cancel",
            }),
          ]),
        ]),
      ]),
    ],
  );

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  bindClose(overlay);

  const continueBtn = overlay.querySelector("[data-roprime-store-continue]");
  continueBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    window.open(STORE_URL, "_blank", "noopener,noreferrer");
    removeExisting();
  });
}

export function hideOfficialStorePopupLegacy() {
  removeExisting();
}
