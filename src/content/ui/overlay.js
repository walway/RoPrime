<div
  data-state="open"
  class="foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop"
  style="pointer-events: auto;"
>
  <div
    role="dialog"
    id="radix-0"
    aria-labelledby="radix-1"
    data-state="open"
    class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high download-dialog"
    data-size="Medium"
    tabindex="-1"
    style="pointer-events: auto;"
  >
    <div class="roprime-overlay-header">
      <img src="resources/roprime-icon.png"></img>
      <h2>{overlayCustomName}</h2>
      <div class="absolute foundation-web-dialog-close-container">
        <button
          type="button"
          class="foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle"
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
      <div
        class="app-icon-bluebg app-icon-windows size-1600"
        role="img"
        aria-label="App Icon"
        title="App Icon"
      ></div>
      <h2
        id="radix-1"
        class="text-heading-small padding-x-xxlarge padding-y-none text-align-x-center flex flex-col"
        aria-hidden="true"
      >
        Possible big text above description
      </h2>
    </div>
    <div class="padding-x-xlarge padding-bottom-xlarge flex">
      <button
        type="button"
        class="foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-medium height-1000 padding-x-medium bg-action-emphasis content-action-emphasis grow"
        style="text-decoration: none;"
      >
        <div
          role="presentation"
          class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"
        ></div>
        <span class="flex items-center min-width-0 gap-small">
          <span class="padding-y-xsmall text-truncate-end text-no-wrap">
            Button Text
          </span>
        </span>
      </button>
    </div>
  </div>
</div>;
