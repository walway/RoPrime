const SUPPORT_ALERT_ROOT_ID = "roprime-support-alert-root";

let supportAlertPromise = null;
let supportAlertKeydownHandler = null;

function removeSupportAlertIfPresent() {
	if (supportAlertKeydownHandler) {
		document.removeEventListener("keydown", supportAlertKeydownHandler, true);
		supportAlertKeydownHandler = null;
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

function showSupportAlertModal() {
	if (supportAlertPromise) return supportAlertPromise;

	supportAlertPromise = new Promise((resolve) => {
		removeSupportAlertIfPresent();

		const root = document.createElement("div");
		root.id = SUPPORT_ALERT_ROOT_ID;
		root.setAttribute("role", "dialog");
		root.setAttribute("aria-modal", "true");
		root.setAttribute("aria-labelledby", "roprime-support-alert-title");

		root.innerHTML = `
<div data-state="open" class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="pointer-events: auto;" data-roprime-support-alert-overlay>
  <div role="dialog" data-state="open" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high" data-size="Medium" tabindex="-1" style="pointer-events: auto;">
    <div class="absolute foundation-web-dialog-close-container">
      <button type="button" class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle roprime-support-alert-close" aria-label="Close">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span role="presentation" class="grow-0 shrink-0 basis-auto icon icon-regular-x size-[var(--icon-size-medium)]"></span>
      </button>
    </div>
    <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge">
      <h2 id="roprime-support-alert-title">Please support RoPrime</h2>
      <p>Profile animations are free, but we will need to keep them up. So, if you like our extension please support it by donating</p>
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex gap-medium justify-end">
      <button type="button" class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis roprime-support-alert-ok">
        <div role="presentation" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">Ok</span>
        </span>
      </button>
    </div>
  </div>
</div>
`;

		const close = (accepted) => {
			removeSupportAlertIfPresent();
			supportAlertPromise = null;
			resolve(accepted);
		};

		root.querySelector(".roprime-support-alert-ok")?.addEventListener("click", () => {
			close(true);
		});
		root
			.querySelector(".roprime-support-alert-close")
			?.addEventListener("click", () => close(false));
		root
			.querySelector("[data-roprime-support-alert-overlay]")
			?.addEventListener("click", (event) => {
				if (event.target === event.currentTarget) close(false);
			});

		supportAlertKeydownHandler = (event) => {
			if (event.key === "Escape") close(false);
		};
		document.addEventListener("keydown", supportAlertKeydownHandler, true);

		appendAlertWhenBodyReady(root);
	});

	return supportAlertPromise;
}

export function promptProfileEffectsSupportNotice() {
	return showSupportAlertModal();
}
