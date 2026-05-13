function asLastErrorMessage() {
	try {
		const msg = chrome.runtime?.lastError?.message;
		return msg ? String(msg) : "";
	} catch {
		return "";
	}
}

async function containsManagementPermission() {
	const has = await chrome.permissions.contains({
		permissions: ["management"],
	});
	return Boolean(has);
}

function normalizeExtensionItem(x) {
	const id = String(x?.id || "");
	return {
		id,
		name: String(x?.name || ""),
		enabled: Boolean(x?.enabled),
	};
}

function findByName(items, needle) {
	const n = String(needle).toLowerCase();
	return (
		items.find((x) =>
			String(x?.name || "")
				.toLowerCase()
				.includes(n),
		) ||
		items.find((x) =>
			String(x?.shortName || "")
				.toLowerCase()
				.includes(n),
		) ||
		items.find((x) =>
			String(x?.description || "")
				.toLowerCase()
				.includes(n),
		) ||
		null
	);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	const type = message?.type;

	if (type === "ROPRIME_MANAGEMENT_STATUS") {
		containsManagementPermission()
			.then((granted) => sendResponse({ ok: true, granted }))
			.catch((err) =>
				sendResponse({ ok: false, error: String(err || "Unknown error") }),
			);
		return true;
	}

	if (type === "ROPRIME_REQUEST_MANAGEMENT") {
		chrome.permissions
			.request({ permissions: ["management"] })
			.then((granted) => sendResponse({ ok: true, granted }))
			.catch((err) =>
				sendResponse({
					ok: false,
					error: asLastErrorMessage() || String(err || ""),
				}),
			);
		return true;
	}

	if (type === "ROPRIME_GET_INSTALLED_EXTENSIONS") {
		containsManagementPermission()
			.then((granted) => {
				if (!granted)
					return sendResponse({
						ok: false,
						error: "missing_management_permission",
					});
				chrome.management.getAll((items) => {
					const lastErr = asLastErrorMessage();
					if (lastErr) return sendResponse({ ok: false, error: lastErr });
					sendResponse({ ok: true, items: items || [] });
				});
			})
			.catch((err) =>
				sendResponse({ ok: false, error: String(err || "Unknown error") }),
			);
		return true;
	}

	if (type === "ROPRIME_GET_WANTED_EXTENSIONS") {
		containsManagementPermission()
			.then((granted) => {
				if (!granted)
					return sendResponse({
						ok: false,
						error: "missing_management_permission",
					});
				chrome.management.getAll((items) => {
					const lastErr = asLastErrorMessage();
					if (lastErr) return sendResponse({ ok: false, error: lastErr });
					const rovalra = findByName(items || [], "rovalra");
					const roseal = findByName(items || [], "roseal");
					const roprime = findByName(items || [], "roprime");
					const robloxqol =
						findByName(items || [], "roqol") ||
						findByName(items || [], "robloxqol") ||
						findByName(items || [], "roblox qol");
					const rovalraOut = rovalra ? normalizeExtensionItem(rovalra) : null;
					const rosealOut = roseal ? normalizeExtensionItem(roseal) : null;
					const roprimeOut = roprime ? normalizeExtensionItem(roprime) : null;
					const robloxqolOut = robloxqol
						? normalizeExtensionItem(robloxqol)
						: null;
					sendResponse({
						ok: true,
						rovalra: rovalraOut,
						roseal: rosealOut,
						roprime: roprimeOut,
						robloxqol: robloxqolOut,
					});
				});
			})
			.catch((err) =>
				sendResponse({ ok: false, error: String(err || "Unknown error") }),
			);
		return true;
	}

	if (type === "ROPRIME_SET_EXTENSION_ENABLED") {
		const id = String(message?.id || "");
		const enabled = Boolean(message?.enabled);
		containsManagementPermission()
			.then((granted) => {
				if (!granted)
					return sendResponse({
						ok: false,
						error: "missing_management_permission",
					});
				if (!id)
					return sendResponse({ ok: false, error: "missing_extension_id" });
				chrome.management.setEnabled(id, enabled, () => {
					const lastErr = asLastErrorMessage();
					if (lastErr) return sendResponse({ ok: false, error: lastErr });
					sendResponse({ ok: true });
				});
			})
			.catch((err) =>
				sendResponse({ ok: false, error: String(err || "Unknown error") }),
			);
		return true;
	}

	return false;
});
