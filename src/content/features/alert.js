const SUPPORT_ALERT_ROOT_ID = "roprime-support-alert-root";

let activeAlertPromise = null;
let activeAlertKeydownHandler = null;

function removeAlertIfPresent() {
	if (activeAlertKeydownHandler) {
		document.removeEventListener("keydown", activeAlertKeydownHandler, true);
		activeAlertKeydownHandler = null;
	}
	document.getElementById(SUPPORT_ALERT_ROOT_ID)?.remove();
}

function appendAlertWhenBodyReady(root) {
	const mount = () => {
		const parent = document.body;
		if (parent) {
			parent.appendChild(root);
			return true;
		}
		return false;
	};
	if (mount()) return;

	const tryMount = () => {
		if (mount()) {
			mo.disconnect();
			document.removeEventListener("DOMContentLoaded", onDomReady);
		}
	};

	const mo = new MutationObserver(() => tryMount());
	mo.observe(document.documentElement, { childList: true });

	function onDomReady() {
		tryMount();
	}
	document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
}

function showAlertModal({ title, bodyHtml, okLabel = "Ok" }) {
	if (activeAlertPromise) return activeAlertPromise;

	activeAlertPromise = new Promise((resolve) => {
		removeAlertIfPresent();

		const root = document.createElement("div");
		root.id = SUPPORT_ALERT_ROOT_ID;
		root.setAttribute("role", "dialog");
		root.setAttribute("aria-modal", "true");
		root.setAttribute("aria-labelledby", "roprime-alert-title");

		root.innerHTML = `
<div data-state="open" class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;" data-roprime-alert-overlay>
  <div role="dialog" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high" data-size="Medium" tabindex="-1" style="pointer-events: auto;">
    <div class="absolute foundation-web-dialog-close-container">
      <button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle roprime-alert-close" aria-label="Close">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"></span>
      </button>
    </div>
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge">
      <h2 id="roprime-alert-title">${title}</h2>
      ${bodyHtml}
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end">
      <button type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis roprime-alert-ok">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">${okLabel}</span>
        </span>
      </button>
    </div>
  </div>
</div>
`;

		const close = (accepted) => {
			removeAlertIfPresent();
			activeAlertPromise = null;
			resolve(accepted);
		};

		root.querySelector(".roprime-alert-ok")?.addEventListener("click", () => {
			close(true);
		});
		root.querySelector(".roprime-alert-close")?.addEventListener("click", () => {
			close(false);
		});
		root
			.querySelector("[data-roprime-alert-overlay]")
			?.addEventListener("click", (event) => {
				if (event.target === event.currentTarget) close(false);
			});

		activeAlertKeydownHandler = (event) => {
			if (event.key === "Escape") close(false);
		};
		document.addEventListener("keydown", activeAlertKeydownHandler, true);

		appendAlertWhenBodyReady(root);
	});

	return activeAlertPromise;
}

export function promptProfileEffectsSupportNotice() {
	return showAlertModal({
		title: "Please support RoPrime",
		bodyHtml: `
      <p>Profile animations are free, but we will need to keep them up. So, if you like our extension please support it by donating</p>
	  <p>Donation link will be added in the settings soon</p>`,
	});
}

export function promptCustomCssCautionNotice() {
	return showAlertModal({
		title: "Custom CSS caution",
		bodyHtml: `
      <p>Custom CSS is executed as third-party code on every Roblox page while RoPrime is enabled.</p>
      <p>Only paste CSS from sources you trust. Malicious CSS could change what you see or interact with on Roblox.</p>`,
	});
}
