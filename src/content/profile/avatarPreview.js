import {
  AssetTypeNameToId,
  AssetTypes,
  AvatarType,
  Authentication,
  FLAGS,
  Outfit,
  OutfitModel,
  OutfitRenderer,
  RBXRenderer,
} from "roavatar-renderer";

let rendererReady = false;
let currentOutfitRenderer = null;
let mountSeq = 0;
let activeMountSeq = 0;
let spinFrameRequestId = null;

const AVATAR_DETAILS_URL = "https://avatar.roblox.com/v2/avatar/users";
const AVATAR_MODEL_URL = "https://avatar.roblox.com/v4/avatar/users";
const extensionApi = globalThis.browser || globalThis.chrome;
const AVATAR_ROTATION_SPEED = -1;

function normalizeFetchHeaders(input) {
  const output = {};
  if (!input) return output;

  if (input instanceof Headers) {
    for (const [key, value] of input.entries()) {
      output[key] = value;
    }
    return output;
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (Array.isArray(entry) && entry.length >= 2) {
        output[String(entry[0])] = String(entry[1]);
      }
    }
    return output;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input)) {
      output[key] = String(value);
    }
  }
  return output;
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function shouldProxyThroughBackground(url, headers) {
  try {
    const parsed = new URL(url, location.href);
    if (parsed.hostname !== "assetdelivery.roblox.com") return false;
    return Object.keys(headers).some(
      (key) => key.toLowerCase() === "roblox-assetformat",
    );
  } catch {
    return false;
  }
}

function backgroundFetch(url, init = {}) {
  return new Promise((resolve, reject) => {
    if (!extensionApi?.runtime?.sendMessage) {
      reject(new Error("extension_runtime_unavailable"));
      return;
    }

    extensionApi.runtime.sendMessage(
      {
        type: "ROPRIME_FETCH",
        url,
        method: String(init.method || "GET"),
        credentials: init.credentials === "omit" ? "omit" : "include",
        headers: normalizeFetchHeaders(init.headers),
      },
      (response) => {
        const lastError = extensionApi.runtime?.lastError?.message;
        if (lastError) {
          reject(new Error(lastError));
          return;
        }
        if (!response?.ok) {
          reject(new Error(String(response?.error || "background_fetch_failed")));
          return;
        }

        resolve(
          new Response(base64ToArrayBuffer(String(response.bodyBase64 || "")), {
            status: Number(response.status) || 500,
            statusText: String(response.statusText || ""),
            headers: response.headers || {},
          }),
        );
      },
    );
  });
}

async function rendererFetch(url, init = {}) {
  const headers = normalizeFetchHeaders(init.headers);
  if (shouldProxyThroughBackground(url, headers)) {
    return backgroundFetch(url, { ...init, headers });
  }
  return fetch(url, init);
}

function enableAvatarSpin() {
  const controls = RBXRenderer.firstScene?.controls;
  if (!controls) return;
  controls.autoRotate = true;
  controls.autoRotateSpeed = AVATAR_ROTATION_SPEED;
  controls.enableRotate = true;
  controls.enablePan = false;
}

function startAvatarSpinSync() {
  stopAvatarSpinSync();
  const tick = () => {
    if (!rendererReady) {
      spinFrameRequestId = null;
      return;
    }

    enableAvatarSpin();
    RBXRenderer.firstScene?.controls?.update?.();
    spinFrameRequestId = globalThis.requestAnimationFrame(tick);
  };

  spinFrameRequestId = globalThis.requestAnimationFrame(tick);
}

function stopAvatarSpinSync() {
  if (spinFrameRequestId !== null) {
    globalThis.cancelAnimationFrame(spinFrameRequestId);
    spinFrameRequestId = null;
  }
}

function normalizeAvatarType(playerAvatarType) {
  if (playerAvatarType === AvatarType.R6 || playerAvatarType === "3" || playerAvatarType === 3) {
    return AvatarType.R6;
  }
  if (
    playerAvatarType === AvatarType.R15 ||
    playerAvatarType === "1" ||
    playerAvatarType === 1
  ) {
    return AvatarType.R15;
  }
  return AvatarType.R15;
}

function normalizeAssetType(assetType) {
  if (assetType && typeof assetType === "object") {
    const id = Number(assetType.id);
    const name = String(assetType.name || "").trim();
    if (Number.isFinite(id) && id > 0) {
      return { id, name: name || AssetTypes[id] || "Asset" };
    }
    if (name) {
      const mappedId = AssetTypeNameToId.get(name);
      if (typeof mappedId === "number") {
        return { id: mappedId, name };
      }
      return { name };
    }
  }

  if (typeof assetType === "number" && Number.isFinite(assetType)) {
    return { id: assetType, name: AssetTypes[assetType] || "Asset" };
  }

  if (typeof assetType === "string") {
    const trimmed = assetType.trim();
    if (!trimmed) return undefined;

    const numericId = Number(trimmed);
    if (Number.isFinite(numericId) && numericId > 0) {
      return { id: numericId, name: AssetTypes[numericId] || "Asset" };
    }

    const mappedId = AssetTypeNameToId.get(trimmed);
    if (typeof mappedId === "number") {
      return { id: mappedId, name: trimmed };
    }

    return { name: trimmed };
  }

  return undefined;
}

function normalizeOutfitJson(raw) {
  const assets = Array.isArray(raw?.assets)
    ? raw.assets.map((asset) => {
        const normalizedAsset = { ...asset };
        const normalizedAssetType = normalizeAssetType(asset?.assetType);
        if (normalizedAssetType) {
          normalizedAsset.assetType = normalizedAssetType;
        }
        return normalizedAsset;
      })
    : [];

  return {
    ...raw,
    assets,
    playerAvatarType: normalizeAvatarType(raw?.playerAvatarType),
    bodyColors: raw?.bodyColors || raw?.bodyColor3s || undefined,
  };
}

function normalizeAvatarModelResult(raw) {
  const avatarModel =
    raw?.avatarModel && typeof raw.avatarModel === "object"
      ? normalizeOutfitJson(raw.avatarModel)
      : normalizeOutfitJson(raw);

  const backgroundAsset = raw?.avatarConfigurations?.background?.backgroundAsset;
  const normalizedBackgroundAsset =
    backgroundAsset && typeof backgroundAsset === "object"
      ? {
          ...backgroundAsset,
          assetType:
            normalizeAssetType(backgroundAsset.assetType) || backgroundAsset.assetType,
        }
      : backgroundAsset;

  return {
    ...raw,
    avatarModel,
    avatarConfigurations:
      raw?.avatarConfigurations && typeof raw.avatarConfigurations === "object"
        ? {
            ...raw.avatarConfigurations,
            background:
              raw.avatarConfigurations.background &&
              typeof raw.avatarConfigurations.background === "object"
                ? {
                    ...raw.avatarConfigurations.background,
                    backgroundAsset: normalizedBackgroundAsset,
                  }
                : raw.avatarConfigurations.background,
          }
        : raw?.avatarConfigurations ?? null,
  };
}

async function fetchAvatarRenderData(userId) {
  const v4Response = await fetch(
    `${AVATAR_MODEL_URL}/${userId}?selectionTypes=0&selectionTypes=1&selectionTypes=2&selectionTypes=3&selectionTypes=4&selectionTypes=5`,
    {
      credentials: "include",
    },
  );

  if (v4Response.ok) {
    const avatarModelJson = normalizeAvatarModelResult(await v4Response.json());
    const outfitModel = new OutfitModel().fromJson(avatarModelJson);
    outfitModel.outfit.id = userId;
    outfitModel.outfit.creatorId = userId;
    return outfitModel;
  }

  const response = await fetch(`${AVATAR_DETAILS_URL}/${userId}/avatar`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Avatar details request failed with ${response.status}`);
  }

  const outfitJson = normalizeOutfitJson(await response.json());
  const outfit = new Outfit();
  outfit.fromJson(outfitJson);
  outfit.id = userId;
  outfit.creatorId = userId;
  return outfit;
}

async function ensureRenderer(host) {
  if (rendererReady) return true;

  FLAGS.FETCH_FUNC = rendererFetch;
  FLAGS.ONLINE_ASSETS = true;
  FLAGS.USE_WORKERS = false;
  RBXRenderer.createLoadingIcon = false;

  const success = await RBXRenderer.fullSetup(true, true);
  if (!success) return false;

  const width = Math.max(320, host.clientWidth || 420);
  RBXRenderer.setBackgroundColor(0xbbbbbb);
  RBXRenderer.setRendererSize(width, 420);
  RBXRenderer.setBackgroundTransparent(true);
  host.appendChild(RBXRenderer.getRendererElement());
  startAvatarSpinSync();
  rendererReady = true;
  return true;
}

async function resetRenderer() {
  try {
    currentOutfitRenderer?.destroy?.();
  } catch {
  }
  currentOutfitRenderer = null;
  stopAvatarSpinSync();

  rendererReady = false;
  RBXRenderer.getRendererElement()?.remove();
}

export async function mountAvatarPreview(host, userId) {
  const seq = ++mountSeq;
  activeMountSeq = seq;

  if (!(host instanceof HTMLElement)) return false;
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const isActive = () => seq === activeMountSeq;

  if (rendererReady) {
    if (!isActive()) return false;
    await resetRenderer();
  }
  if (!isActive()) return false;

  const ready = await ensureRenderer(host);
  if (!isActive()) return false;
  if (!ready) return false;

  let avatarRenderData = null;
  try {
    avatarRenderData = await fetchAvatarRenderData(userId);
  } catch {
    if (isActive()) await resetRenderer();
    return false;
  }
  if (!isActive()) return false;
  if (
    !(avatarRenderData instanceof Outfit) &&
    !(avatarRenderData instanceof OutfitModel)
  ) {
    if (isActive()) await resetRenderer();
    return false;
  }

  const auth = new Authentication();
  const outfitRenderer = new OutfitRenderer(auth, avatarRenderData);
  if (!isActive()) {
    try {
      outfitRenderer?.destroy?.();
    } catch {
    }
    return false;
  }
  currentOutfitRenderer = outfitRenderer;

  outfitRenderer.startAnimating();
  try {
    await outfitRenderer.setMainAnimation("idle");
    enableAvatarSpin();
    if (!isActive()) {
      await resetRenderer();
      return false;
    }
    return true;
  } catch {
    if (isActive()) await resetRenderer();
    return false;
  }
}

export async function unmountAvatarPreview() {
  await resetRenderer();
}
