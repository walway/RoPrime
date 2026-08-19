const TOOLTIP_CLASSES = {
  popper:
    "MuiPopper-root MuiTooltip-popper MuiTooltip-popperInteractive MuiTooltip-popperArrow web-blox-css-mui-l66bl4",
  tooltip:
    "MuiTooltip-tooltip web-blox-css-tss-t4ajt1-Typography-tooltip MuiTooltip-tooltipArrow web-blox-css-mui-1x77lqp",
  arrow:
    "MuiTooltip-arrow web-blox-css-tss-1deuxot-Tooltip-arrow web-blox-css-mui-1urvb1y",
};

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

export function createTooltip(options = {}) {
  const { text = "", placement = "bottom" } = options;

  const popper = document.createElement("div");
  popper.role = "tooltip";
  popper.className = TOOLTIP_CLASSES.popper;
  popper.style.opacity = "0";
  popper.style.pointerEvents = "none";

  const tooltip = document.createElement("div");
  tooltip.className = `${TOOLTIP_CLASSES.tooltip} ${placementClass(placement)}`;
  tooltip.textContent = text;

  const arrow = document.createElement("span");
  arrow.className = TOOLTIP_CLASSES.arrow;
  tooltip.appendChild(arrow);
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
