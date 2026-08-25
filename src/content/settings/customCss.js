import { minimalEditor } from "prism-code-editor/setups";
import "prism-code-editor/languages/css";
import "prism-code-editor/prism/languages/css";
import { saveSettings, settingsState } from "../core/core.js";
import { promptCustomCssCautionNotice } from "../alerts/alert.js";
import { syncCustomCss } from "../features/customCss.js";
import { setHidden } from "../ui/visibility.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

let cssEditor = null;

let cssEditorHost = null;

const LINE_HEIGHT_PX = 22;
const EDITOR_PADDING_PX = 16;
const MIN_LINES = 4;
const MAX_LINES = 18;

export function buildCustomCssHtml() {
  return `
		<div class="roprime-custom-css-block">
			<div class="roprime-custom-css-heading">
				<div class="roprime-toggle-title" data-i18n="settings.customCss.title"></div>
				<div class="roprime-toggle-desc" data-i18n="settings.customCss.description"></div>
			</div>
			<div class="roprime-custom-css-editor-wrap">
				<div
					class="roprime-custom-css-placeholder"
					aria-hidden="true"
				></div>
				<div class="roprime-custom-css-editor-host"></div>
			</div>
		</div>`;
}

function destroyCssEditor() {
  cssEditor?.remove();
  cssEditor = null;
  cssEditorHost = null;
}

function getEditorWrap() {
  return cssEditorHost?.closest(".roprime-custom-css-editor-wrap");
}

function isCustomCssEditorLocked() {
  return !settingsState.customCssCautionAccepted;
}

function applyCustomCssEditorLock(inner) {
  const locked = isCustomCssEditorLocked();
  const wrap = getEditorWrap();
  if (wrap instanceof HTMLElement) {
    wrap.classList.toggle("is-locked", locked);
  }
  if (cssEditor) {
    cssEditor.textarea.readOnly = locked;
    cssEditor.textarea.setAttribute("aria-readonly", locked ? "true" : "false");
  }
  syncPlaceholder(inner);
}

function configureEditorShadow(host) {
  const shadow = host.shadowRoot;
  const container = shadow?.querySelector(".prism-code-editor");
  if (!(shadow instanceof ShadowRoot) || !(container instanceof HTMLElement))
    return;

  let override = shadow.getElementById("roprime-pce-overrides");
  if (!override) {
    override = document.createElement("style");
    override.id = "roprime-pce-overrides";
    shadow.appendChild(override);
  }
  override.textContent = `
		:host {
			display: block;
		}
		.prism-code-editor {
			margin: 0;
			border-radius: 10px;
			overflow: visible !important;
			--pce-bg: var(--roprime-editor-bg, var(--color-surface-300));
			background: var(--roprime-editor-bg, var(--color-surface-300));
			--pce-cursor: #f97316;
		}
		.prism-code-editor,
		.prism-code-editor * {
			scrollbar-width: auto;
		}
		.active-line:after {
			display: none !important;
			border: none !important;
			background: transparent !important;
		}
		.active-line {
			--pce-bg-highlight: transparent;
			--pce-border-highlight: none;
		}
	`;
}

function applyEditorHeight(editor) {
  const host = cssEditorHost;
  const wrap = getEditorWrap();
  const shadow = host?.shadowRoot;
  const container = shadow?.querySelector(".prism-code-editor");
  if (!(container instanceof HTMLElement)) return;

  const lineCount = Math.max(1, editor.value.split("\n").length);
  const minH = MIN_LINES * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
  const maxH = MAX_LINES * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
  const contentH = lineCount * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
  const editorH = Math.max(minH, contentH);

  const wrapScrollTop = wrap instanceof HTMLElement ? wrap.scrollTop : 0;
  const selStart = editor.textarea.selectionStart;
  const selEnd = editor.textarea.selectionEnd;

  container.style.height = `${editorH}px`;
  container.style.minHeight = `${minH}px`;
  container.style.overflow = "visible";
  container.style.overflowY = "visible";

  if (wrap instanceof HTMLElement) {
    wrap.style.maxHeight = `${maxH}px`;
    wrap.style.overflowY = contentH > maxH ? "auto" : "hidden";
    requestAnimationFrame(() => {
      wrap.scrollTop = wrapScrollTop;
      try {
        editor.textarea.setSelectionRange(selStart, selEnd);
      } catch {
        /* ignore */
      }
    });
  }
}

function syncPlaceholder(inner) {
  const placeholder = inner.querySelector(".roprime-custom-css-placeholder");
  if (!(placeholder instanceof HTMLElement)) return;

  const value = String(cssEditor?.value ?? settingsState.customCss ?? "");
  const empty = !value.trim();
  const focused = !!cssEditor?.focused;
  setHidden(placeholder, !empty || focused);
  placeholder.setAttribute("aria-hidden", empty && !focused ? "false" : "true");
}

function ensureCssEditor(inner) {
  const host = inner.querySelector(".roprime-custom-css-editor-host");
  if (!(host instanceof HTMLElement)) return;
  if (cssEditorHost === host && cssEditor) return;

  destroyCssEditor();
  cssEditorHost = host;

  let cautionPromptActive = false;

  async function ensureCustomCssCautionAccepted() {
    if (settingsState.customCssCautionAccepted) return true;
    if (cautionPromptActive) return false;
    cautionPromptActive = true;
    try {
      const accepted = await promptCustomCssCautionNotice();
      if (!accepted) return false;
      settingsState.customCssCautionAccepted = true;
      saveSettings();
      applyCustomCssEditorLock(inner);
      return true;
    } finally {
      cautionPromptActive = false;
    }
  }

  cssEditor = minimalEditor(
    host,
    {
      theme: "github-dark-dimmed",
      language: "css",
      value: String(settingsState.customCss || ""),
      wordWrap: true,
      lineNumbers: false,
      insertSpaces: true,
      tabSize: 2,
      readOnly: isCustomCssEditorLocked(),
      onUpdate: (value, editor) => {
        if (isCustomCssEditorLocked()) return;
        settingsState.customCss = value;
        saveSettings();
        syncCustomCss();
        applyEditorHeight(editor);
        syncPlaceholder(inner);
      },
    },
    () => {
      host.classList.add("roprime-custom-css-editor-host--ready");
      if (!cssEditor) return;
      configureEditorShadow(host);
      applyEditorHeight(cssEditor);
      applyCustomCssEditorLock(inner);

      cssEditor.textarea.addEventListener("focus", () => {
        void (async () => {
          if (settingsState.customCssCautionAccepted) {
            syncPlaceholder(inner);
            return;
          }
          const allowed = await ensureCustomCssCautionAccepted();
          if (!allowed) cssEditor?.textarea.blur();
          syncPlaceholder(inner);
        })();
      });
      cssEditor.textarea.addEventListener("blur", () => syncPlaceholder(inner));
    },
  );
}

export function syncCustomCssUi(inner) {
  if (!(inner instanceof HTMLElement)) return;

  ensureCssEditor(inner);

  const value = String(settingsState.customCss || "");
  if (cssEditor && cssEditor.value !== value) {
    cssEditor.setOptions({ value });
    applyEditorHeight(cssEditor);
  }

  const placeholder = inner.querySelector(".roprime-custom-css-placeholder");
  if (placeholder instanceof HTMLElement && !placeholder.textContent?.trim()) {
    placeholder.textContent = accountSettingsPaneT("settings.customCss.placeholder");
  }

  applyCustomCssEditorLock(inner);
}

export function bindCustomCssControls(_inner) {}
