const TOOLTIP_Z_INDEX = "2147483647";

function placementClass(placement) {
  return placement === "top"
    ? "MuiTooltip-tooltipPlacementTop"
    : "MuiTooltip-tooltipPlacementBottom";
}

function positionTooltip(popper, anchor, placement) {
  const rect = anchor.getBoundingClientRect();
  const popperRect = popper.getBoundingClientRect();
  const gap = 8;
  let top;
  let left;

  if (placement === "top") {
    top = rect.top - popperRect.height - gap;
    left = rect.left + (rect.width - popperRect.width) / 2;
  } else {
    top = rect.bottom + gap;
    left = rect.left + (rect.width - popperRect.width) / 2;
  }

  popper.style.position = "fixed";
  popper.style.inset = "auto";
  popper.style.top = `${Math.round(top)}px`;
  popper.style.left = `${Math.round(left)}px`;
  popper.style.margin = "0";
  popper.style.transform = "none";
  popper.dataset.popperPlacement = placement === "top" ? "top" : "bottom";
}

function applyTooltipSurfaceStyles(node) {
  Object.assign(node.style, {
    background: "var(--color-surface-200, #393b3d)",
    color: "var(--color-content-emphasis, #f7f7f8)",
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.4",
    maxWidth: "280px",
    boxShadow:
      "var(--shadow-transient-high, 0 8px 24px rgba(0, 0, 0, 0.35))",
    pointerEvents: "none",
  });
}

export function createTooltip(options = {}) {
  const { text = "", placement = "bottom" } = options;

  const popper = document.createElement("div");
  popper.role = "tooltip";
  popper.className =
    "MuiPopper-root MuiTooltip-popper MuiTooltip-popperInteractive MuiTooltip-popperArrow";
  popper.style.opacity = "0";
  popper.style.pointerEvents = "none";
  popper.style.zIndex = TOOLTIP_Z_INDEX;

  const tooltip = document.createElement("div");
  tooltip.className = `MuiTooltip-tooltip ${placementClass(placement)}`;
  tooltip.textContent = text;
  applyTooltipSurfaceStyles(tooltip);

  popper.appendChild(tooltip);
  return popper;
}

export function attachTooltip(anchor, options = {}) {
  if (!(anchor instanceof HTMLElement)) return () => {};

  const { text = "", placement = "bottom" } = options;
  let popper = null;

  const hide = () => {
    popper?.remove();
    popper = null;
  };

  const show = () => {
    hide();
    popper = createTooltip({ text, placement });
    document.body.appendChild(popper);
    positionTooltip(popper, anchor, placement);
    requestAnimationFrame(() => {
      if (popper) popper.style.opacity = "1";
    });
  };

  anchor.addEventListener("mouseenter", show);
  anchor.addEventListener("mouseleave", hide);
  anchor.addEventListener("focus", show);
  anchor.addEventListener("blur", hide);

  return () => {
    hide();
    anchor.removeEventListener("mouseenter", show);
    anchor.removeEventListener("mouseleave", hide);
    anchor.removeEventListener("focus", show);
    anchor.removeEventListener("blur", hide);
  };
}
