import { shouldRunRoPrimeOnCurrentPage } from "../core/core.js";
import { setHidden } from "../ui/visibility.js";

const RP_RICK_ROLL_ATTR = "data-roprime-rick-roll";
const FAQ_PANEL_ID = "faq-panel-Action.HowToGetRobuxForFree";

function findBuyRobuxFaqContainer() {
  const root = document.querySelector(".buy-robux-content");
  if (!(root instanceof HTMLElement)) return null;
  const section = root.querySelector(":scope > div:last-child");
  if (!(section instanceof HTMLElement)) return null;
  const container = section.querySelector(":scope > div:last-child");
  return container instanceof HTMLElement ? container : null;
}

function buildRickRollFaq() {
  const wrapper = document.createElement("div");
  wrapper.setAttribute(RP_RICK_ROLL_ATTR, "1");
  wrapper.className =
    "radius-medium stroke-standard stroke-default overflow-hidden padding-x-medium padding-y-small";

  const toggle = document.createElement("div");
  toggle.setAttribute("role", "button");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", FAQ_PANEL_ID);
  toggle.tabIndex = 0;
  toggle.className =
    "width-full cursor-pointer flex flex-row items-center justify-between height-1000 content-default";

  const title = document.createElement("span");
  title.className = "text-align-x-left text-title-medium";
  title.textContent = "How to get Robux for free?";

  const chevron = document.createElement("span");
  chevron.setAttribute("aria-hidden", "true");
  chevron.setAttribute("data-testid", "foundation-web-icon");
  chevron.className =
    "grow-0 shrink-0 basis-auto icon icon-regular-chevron-large-down size-[var(--icon-size-medium)] content-emphasis";

  toggle.append(title, chevron);

  const panel = document.createElement("div");
  panel.id = FAQ_PANEL_ID;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "How to get Robux for free?");
  panel.className = "padding-bottom-medium text-body-medium content-default";
  setHidden(panel, true);
  panel.style.whiteSpace = "pre-wrap";
  panel.innerHTML =
    '<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?si=z3oFdFY3HE3Dkufe" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';

  wrapper.append(toggle, panel);

  const setExpanded = (expanded) => {
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    chevron.classList.toggle("icon-regular-chevron-large-down", !expanded);
    chevron.classList.toggle("icon-regular-chevron-large-up", expanded);
    setHidden(panel, !expanded);
  };

  const onToggle = () =>
    setExpanded(toggle.getAttribute("aria-expanded") !== "true");

  toggle.addEventListener("click", onToggle);
  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  });

  return wrapper;
}

export function syncRickRollEasterEgg() {
  if (!shouldRunRoPrimeOnCurrentPage()) return;

  const container = findBuyRobuxFaqContainer();
  if (!container) return;
  if (container.querySelector(`[${RP_RICK_ROLL_ATTR}]`)) return;

  container.appendChild(buildRickRollFaq());
}

import { registerFeature } from '../features/registry.js';
registerFeature(syncRickRollEasterEgg);

