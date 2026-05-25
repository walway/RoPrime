import { minimalEditor } from "prism-code-editor/setups";
import "prism-code-editor/languages/css";
import "prism-code-editor/prism/languages/css";
import { saveSettings, settingsState } from "../core/core.js";
import { syncCustomCss } from "../features/customCss.js";
import { t as accountSettingsPaneT } from "./roprimeAccountSettingsPage.js";

/** @type {import("prism-code-editor").PrismEditor | null} */
let cssEditor = null;
/** @type {HTMLElement | null} */
let cssEditorHost = null;

const LINE_HEIGHT_PX = 22;
const EDITOR_PADDING_PX = 16;
const MIN_LINES = 4;
const MAX_LINES = 18;

export function buildCustomCssHtml() {
	return `
		<div class="roprime-custom-css-block">
			<div class="roprime-custom-css-heading">
				<div class="roprime-toggle-title" data-i18n="Custom CSS title"></div>
				<div class="roprime-toggle-desc" data-i18n="Custom CSS description"></div>
			</div>
			<div class="roprime-custom-css-editor-wrap" data-roprime-custom-css-editor-wrap>
				<div
					class="roprime-custom-css-placeholder"
					data-roprime-custom-css-placeholder
					data-i18n="Custom CSS placeholder"
					aria-hidden="true"
				></div>
				<div class="roprime-custom-css-editor-host" data-roprime-custom-css-editor-host></div>
			</div>
		</div>`;
}

function destroyCssEditor() {
	cssEditor?.remove();
	cssEditor = null;
	cssEditorHost = null;
}

function configureEditorShadow(host) {
	const shadow = host.shadowRoot;
	const container = shadow?.querySelector(".prism-code-editor");
	if (!(shadow instanceof ShadowRoot) || !(container instanceof HTMLElement)) return;

	let override = shadow.getElementById("roprime-pce-overrides");
	if (!override) {
		override = document.createElement("style");
		override.id = "roprime-pce-overrides";
		shadow.appendChild(override);
	}
	override.textContent = `
		:host {
			display: block;
			color-scheme: dark;
		}
		.prism-code-editor {
			margin: 0;
			border-radius: 10px;
			overflow-y: auto;
			overflow-x: hidden;
		}
	`;
}

function applyEditorHeight(editor) {
	const host = cssEditorHost;
	const shadow = host?.shadowRoot;
	const container = shadow?.querySelector(".prism-code-editor");
	if (!(container instanceof HTMLElement)) return;

	const lineCount = Math.max(1, editor.value.split("\n").length);
	const minH = MIN_LINES * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
	const maxH = MAX_LINES * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
	const contentH = lineCount * LINE_HEIGHT_PX + EDITOR_PADDING_PX;
	const height = Math.min(maxH, Math.max(minH, contentH));

	container.style.height = `${height}px`;
	container.style.overflowY = lineCount > MAX_LINES ? "auto" : "hidden";
}

function syncPlaceholder(inner) {
	const placeholder = inner.querySelector("[data-roprime-custom-css-placeholder]");
	if (!(placeholder instanceof HTMLElement)) return;

	const value = String(cssEditor?.value ?? settingsState.customCss ?? "");
	const empty = !value.trim();
	const focused = !!cssEditor?.focused;
	placeholder.hidden = !empty || focused;
	placeholder.setAttribute("aria-hidden", empty && !focused ? "false" : "true");
}

function ensureCssEditor(inner) {
	const host = inner.querySelector("[data-roprime-custom-css-editor-host]");
	if (!(host instanceof HTMLElement)) return;
	if (cssEditorHost === host && cssEditor) return;

	destroyCssEditor();
	cssEditorHost = host;

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
			onUpdate: (value, editor) => {
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
			syncPlaceholder(inner);

			cssEditor.on("update", () => applyEditorHeight(cssEditor));
			cssEditor.textarea.addEventListener("focus", () => syncPlaceholder(inner));
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

	const placeholder = inner.querySelector("[data-roprime-custom-css-placeholder]");
	if (placeholder instanceof HTMLElement && !placeholder.textContent?.trim()) {
		placeholder.textContent = accountSettingsPaneT("Custom CSS placeholder");
	}

	syncPlaceholder(inner);
}

export function bindCustomCssControls(_inner) {
	/* Editor handles input; placeholder sync runs from ensureCssEditor listeners. */
}
