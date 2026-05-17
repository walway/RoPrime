const REGISTRY_KEY = "registry";

const DEFAULT_REGISTRY = {
	version: 1,
	effects: {},
	equipped: {},
};

const CORS_ORIGINS = new Set([
	"https://www.roblox.com",
	"https://web.roblox.com",
	"https://roblox.com",
]);

function emptyRegistry() {
	return JSON.parse(JSON.stringify(DEFAULT_REGISTRY));
}

function corsHeaders(request, env) {
	const origin = request.headers.get("Origin") || "";
	const allowed =
		CORS_ORIGINS.has(origin) ||
		(env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN);
	return {
		"Access-Control-Allow-Origin": allowed ? origin : "https://www.roblox.com",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
	};
}

function jsonResponse(request, env, body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(request, env),
		},
	});
}

async function readRegistry(env) {
	const raw = await env.PROFILE_EFFECTS_KV.get(REGISTRY_KEY);
	if (!raw) return emptyRegistry();
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return emptyRegistry();
		if (!parsed.effects || typeof parsed.effects !== "object") {
			parsed.effects = {};
		}
		if (!parsed.equipped || typeof parsed.equipped !== "object") {
			parsed.equipped = {};
		}
		return parsed;
	} catch {
		return emptyRegistry();
	}
}

async function writeRegistry(env, registry) {
	await env.PROFILE_EFFECTS_KV.put(REGISTRY_KEY, JSON.stringify(registry));
}

function assertSecret(request, env) {
	if (!env.REGISTER_SECRET) return true;
	const header = request.headers.get("X-RoPrime-Secret");
	return header && header === env.REGISTER_SECRET;
}

async function handlePurchase(request, env) {
	if (!assertSecret(request, env)) {
		return jsonResponse(request, env, { error: "Unauthorized" }, 401);
	}

	const body = await request.json().catch(() => null);
	const userId = Number(body?.userId);
	const effectId = String(body?.effectId || "").trim();
	if (!Number.isFinite(userId) || userId <= 0 || !effectId) {
		return jsonResponse(request, env, { error: "Invalid userId or effectId" }, 400);
	}

	const registry = await readRegistry(env);
	if (!registry.effects[effectId]) {
		registry.effects[effectId] = { owners: {} };
	}
	if (!registry.effects[effectId].owners) {
		registry.effects[effectId].owners = {};
	}

	registry.effects[effectId].owners[String(userId)] = {
		purchasedAt: Number(body?.purchasedAt) || Date.now(),
	};

	await writeRegistry(env, registry);
	return jsonResponse(request, env, { ok: true, userId, effectId });
}

async function handleEquip(request, env) {
	if (!assertSecret(request, env)) {
		return jsonResponse(request, env, { error: "Unauthorized" }, 401);
	}

	const body = await request.json().catch(() => null);
	const userId = Number(body?.userId);
	const effectId = body?.effectId ? String(body.effectId).trim() : "";
	if (!Number.isFinite(userId) || userId <= 0) {
		return jsonResponse(request, env, { error: "Invalid userId" }, 400);
	}

	const registry = await readRegistry(env);
	const key = String(userId);
	if (effectId) {
		registry.equipped[key] = effectId;
	} else {
		delete registry.equipped[key];
	}

	await writeRegistry(env, registry);
	return jsonResponse(request, env, { ok: true, userId, effectId: effectId || null });
}

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders(request, env) });
		}

		const url = new URL(request.url);

		if (request.method === "GET" && url.pathname === "/registry") {
			const registry = await readRegistry(env);
			return jsonResponse(request, env, registry);
		}

		if (request.method === "POST" && url.pathname === "/purchase") {
			return handlePurchase(request, env);
		}

		if (request.method === "POST" && url.pathname === "/equip") {
			return handleEquip(request, env);
		}

		return jsonResponse(request, env, { error: "Not found" }, 404);
	},
};
