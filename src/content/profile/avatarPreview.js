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
let currentHost = null;
let currentUserId = 0;
let currentAvatarSource = null;
let currentAvatarType = AvatarType.R15;
let currentViewMode = "3d";
let renderSeq = 0;

const AVATAR_DETAILS_URL = "https://avatar.roblox.com/v2/avatar/users";
const AVATAR_MODEL_URL = "https://avatar.roblox.com/v4/avatar/users";
const AVATAR_THUMBNAIL_URL = "https://thumbnails.roblox.com/v1/users/avatar";
const extensionApi = globalThis.browser || globalThis.chrome;
const AVATAR_ROTATION_SPEED = -1;
const PREVIEW_HEIGHT = 420;
const LOADER_MAX_VISIBLE_MS = 2000;
const BUTTON_CLASS =
  "foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-standard content-action-standard";

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
          reject(
            new Error(String(response?.error || "background_fetch_failed")),
          );
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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clearPreviewHost(host) {
  if (!(host instanceof HTMLElement)) return;
  host.textContent = "";
}

function createButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.style.textDecoration = "none";

  const stateLayer = document.createElement("div");
  stateLayer.setAttribute("aria-hidden", "true");
  stateLayer.setAttribute("data-testid", "foundation-web-state-layer");
  stateLayer.className =
    "absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none";

  const outerSpan = document.createElement("span");
  outerSpan.className = "flex items-center min-width-0 gap-small";
  const textSpan = document.createElement("span");
  textSpan.className = "padding-y-xsmall text-truncate-end text-no-wrap";
  textSpan.textContent = label;
  outerSpan.appendChild(textSpan);

  button.append(stateLayer, outerSpan);
  return button;
}

function getOppositeAvatarType(avatarType) {
  return avatarType === AvatarType.R6 ? AvatarType.R15 : AvatarType.R6;
}

function getAvatarTypeLabel(avatarType) {
  return avatarType === AvatarType.R6 ? "R6" : "R15";
}

function appendPreviewControls(host) {
  host.querySelectorAll("[data-roprime-avatar-control]").forEach((node) => {
    node.remove();
  });

  const viewButton = createButton(currentViewMode === "3d" ? "2D" : "3D");
  viewButton.dataset.roprimeAvatarControl = "1";
  viewButton.style.position = "absolute";
  viewButton.style.top = "12px";
  viewButton.style.right = "12px";
  viewButton.style.zIndex = "3";
  viewButton.addEventListener("click", () => {
    currentViewMode = currentViewMode === "3d" ? "2d" : "3d";
    void renderCurrentPreview();
  });

  const rigButton = createButton(
    getAvatarTypeLabel(getOppositeAvatarType(currentAvatarType)),
  );
  rigButton.dataset.roprimeAvatarControl = "1";
  rigButton.style.position = "absolute";
  rigButton.style.right = "12px";
  rigButton.style.bottom = "12px";
  rigButton.style.zIndex = "3";
  rigButton.addEventListener("click", () => {
    currentAvatarType = getOppositeAvatarType(currentAvatarType);
    void renderCurrentPreview();
  });

  host.append(viewButton, rigButton);
  return { viewButton, rigButton };
}

function createLoadingStage() {
  const loadingStage = document.createElement("div");
  loadingStage.className =
    "thumbnail-2d-container avatar-loading-shimmer-overlay no-background-thumbnail thumbnail-span";
  loadingStage.style.position = "relative";
  loadingStage.style.width = "100%";
  loadingStage.style.height = "100%";
  loadingStage.style.pointerEvents = "none";
  loadingStage.style.display = "block";
  return loadingStage;
}

function appendSpinnerLoader(target, marginTop = "0px") {
  const loader = document.createElement("div");
  loader.className = "thumbnail-loader";
  loader.style.marginTop = marginTop;
  const spinner = document.createElement("span");
  spinner.className = "spinner spinner-default";
  loader.appendChild(spinner);
  target.appendChild(loader);
  return loader;
}

function attachTransientLoader(host, localMountSeq, localRenderSeq) {
  const loadingStage = createLoadingStage();
  host.appendChild(loadingStage);

  const spinnerLoader = appendSpinnerLoader(host);
  let closed = false;
  let timeoutId = 0;

  const close = () => {
    if (closed) return;
    closed = true;
    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
      timeoutId = 0;
    }
    spinnerLoader.remove();
    loadingStage.remove();
  };

  timeoutId = globalThis.setTimeout(() => {
    if (isActiveRender(localMountSeq, localRenderSeq)) {
      close();
    }
  }, LOADER_MAX_VISIBLE_MS);

  return { close };
}

function buildAvatarRenderData(source, avatarType) {
  if (!source || typeof source !== "object") return null;

  if (source.kind === "outfit-model") {
    const next = cloneJson(source.raw);
    if (next?.avatarModel && typeof next.avatarModel === "object") {
      next.avatarModel.playerAvatarType = normalizeAvatarType(avatarType);
    }
    const outfitModel = new OutfitModel().fromJson(next);
    outfitModel.outfit.id = source.userId;
    outfitModel.outfit.creatorId = source.userId;
    return outfitModel;
  }

  if (source.kind === "outfit") {
    const next = cloneJson(source.raw);
    next.playerAvatarType = normalizeAvatarType(avatarType);
    const outfit = new Outfit();
    outfit.fromJson(next);
    outfit.id = source.userId;
    outfit.creatorId = source.userId;
    return outfit;
  }

  return null;
}

async function fetchAvatarThumbnailUrl(userId) {
  const response = await fetch(
    `${AVATAR_THUMBNAIL_URL}?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error(`Avatar thumbnail request failed with ${response.status}`);
  }
  const json = await response.json();
  const imageUrl = String(json?.data?.[0]?.imageUrl || "").trim();
  if (!imageUrl) {
    throw new Error("Avatar thumbnail missing imageUrl");
  }
  return imageUrl;
}

function isActiveRender(localMountSeq, localRenderSeq) {
  return localMountSeq === activeMountSeq && localRenderSeq === renderSeq;
}

async function render3DPreview(localMountSeq, localRenderSeq) {
  if (!(currentHost instanceof HTMLElement) || !currentAvatarSource)
    return false;

  clearPreviewHost(currentHost);
  const loader = attachTransientLoader(
    currentHost,
    localMountSeq,
    localRenderSeq,
  );
  appendPreviewControls(currentHost);

  destroyCurrentOutfitRenderer();
  if (!isActiveRender(localMountSeq, localRenderSeq)) return false;

  const ready = await ensureRenderer(currentHost);
  if (!isActiveRender(localMountSeq, localRenderSeq)) return false;
  if (!ready) return false;

  const rendererElement = RBXRenderer.getRendererElement();
  if (rendererElement instanceof HTMLElement) {
    rendererElement.style.position = "absolute";
    rendererElement.style.inset = "0";
    rendererElement.style.width = "100%";
    rendererElement.style.height = "100%";
    rendererElement.style.visibility = "hidden";
  }

  const avatarRenderData = buildAvatarRenderData(
    currentAvatarSource,
    currentAvatarType,
  );
  if (
    !(avatarRenderData instanceof Outfit) &&
    !(avatarRenderData instanceof OutfitModel)
  ) {
    loader.close();
    return false;
  }

  const auth = new Authentication();
  const outfitRenderer = new OutfitRenderer(auth, avatarRenderData);
  if (!isActiveRender(localMountSeq, localRenderSeq)) {
    try {
      outfitRenderer?.destroy?.();
    } catch {}
    return false;
  }

  currentOutfitRenderer = outfitRenderer;
  outfitRenderer.startAnimating();

  try {
    await outfitRenderer.setMainAnimation("idle");
    if (!isActiveRender(localMountSeq, localRenderSeq)) {
      return false;
    }
    enableAvatarSpin();
    startAvatarSpinSync();
    loader.close();
    if (rendererElement instanceof HTMLElement) {
      rendererElement.style.visibility = "";
    }
    appendPreviewControls(currentHost);
    return true;
  } catch {
    try {
      outfitRenderer?.destroy?.();
    } catch {}
    if (currentOutfitRenderer === outfitRenderer) {
      currentOutfitRenderer = null;
    }
    loader.close();
    return false;
  }
}

async function render2DPreview(localMountSeq, localRenderSeq) {
  if (!(currentHost instanceof HTMLElement)) return false;

  detachRendererElement();
  destroyCurrentOutfitRenderer();
  if (!isActiveRender(localMountSeq, localRenderSeq)) return false;

  clearPreviewHost(currentHost);
  const loader = attachTransientLoader(
    currentHost,
    localMountSeq,
    localRenderSeq,
  );
  appendPreviewControls(currentHost);

  let imageUrl = "";
  try {
    imageUrl = await fetchAvatarThumbnailUrl(currentUserId);
  } catch {
    return false;
  }

  if (!isActiveRender(localMountSeq, localRenderSeq)) return false;

  const span = document.createElement("span");
  span.className =
    "thumbnail-2d-container no-background-thumbnail thumbnail-span";
  span.style.display = "flex";
  span.style.alignItems = "center";
  span.style.justifyContent = "center";
  span.style.width = "100%";
  span.style.height = "100%";
  span.style.overflow = "hidden";
  span.style.pointerEvents = "none";
  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "";
  image.style.display = "block";
  image.style.maxWidth = "100%";
  image.style.maxHeight = "100%";
  image.style.width = "auto";
  image.style.height = "auto";
  image.style.objectFit = "contain";
  span.appendChild(image);
  loader.close();
  clearPreviewHost(currentHost);
  currentHost.appendChild(span);
  appendPreviewControls(currentHost);
  return true;
}

async function renderCurrentPreview() {
  const localMountSeq = activeMountSeq;
  const localRenderSeq = ++renderSeq;
  if (!(currentHost instanceof HTMLElement)) return false;
  if (currentViewMode === "2d") {
    return render2DPreview(localMountSeq, localRenderSeq);
  }
  return render3DPreview(localMountSeq, localRenderSeq);
}

function normalizeAvatarType(playerAvatarType) {
  if (
    playerAvatarType === AvatarType.R6 ||
    playerAvatarType === "3" ||
    playerAvatarType === 3
  ) {
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

  const backgroundAsset =
    raw?.avatarConfigurations?.background?.backgroundAsset;
  const normalizedBackgroundAsset =
    backgroundAsset && typeof backgroundAsset === "object"
      ? {
          ...backgroundAsset,
          assetType:
            normalizeAssetType(backgroundAsset.assetType) ||
            backgroundAsset.assetType,
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
        : (raw?.avatarConfigurations ?? null),
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
    return {
      kind: "outfit-model",
      userId,
      raw: avatarModelJson,
      avatarType: normalizeAvatarType(
        avatarModelJson?.avatarModel?.playerAvatarType,
      ),
    };
  }

  const response = await fetch(`${AVATAR_DETAILS_URL}/${userId}/avatar`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Avatar details request failed with ${response.status}`);
  }

  const outfitJson = normalizeOutfitJson(await response.json());
  return {
    kind: "outfit",
    userId,
    raw: outfitJson,
    avatarType: normalizeAvatarType(outfitJson?.playerAvatarType),
  };
}

async function ensureRenderer(host) {
  const width = Math.max(320, host.clientWidth || 420);
  const rendererElement = RBXRenderer.getRendererElement();
  if (rendererReady) {
    RBXRenderer.setRendererSize(width, PREVIEW_HEIGHT);
    RBXRenderer.setBackgroundTransparent(true);
    if (
      rendererElement instanceof HTMLElement &&
      rendererElement.parentElement !== host
    ) {
      host.appendChild(rendererElement);
    }
    return true;
  }

  FLAGS.FETCH_FUNC = rendererFetch;
  FLAGS.ONLINE_ASSETS = true;
  FLAGS.USE_WORKERS = false;
  RBXRenderer.createLoadingIcon = false;

  const success = await RBXRenderer.fullSetup(true, true);
  if (!success) return false;

  RBXRenderer.setBackgroundColor(0xbbbbbb);
  RBXRenderer.setRendererSize(width, PREVIEW_HEIGHT);
  RBXRenderer.setBackgroundTransparent(true);
  host.appendChild(RBXRenderer.getRendererElement());
  rendererReady = true;
  return true;
}

function destroyCurrentOutfitRenderer() {
  try {
    currentOutfitRenderer?.destroy?.();
  } catch {}
  currentOutfitRenderer = null;
  stopAvatarSpinSync();
}

function detachRendererElement() {
  RBXRenderer.getRendererElement()?.remove();
}

async function resetRenderer() {
  destroyCurrentOutfitRenderer();
  rendererReady = false;
  detachRendererElement();
}

export async function mountAvatarPreview(host, userId) {
  const seq = ++mountSeq;
  activeMountSeq = seq;
  currentHost = host;
  currentUserId = userId;
  currentAvatarSource = null;
  currentViewMode = "3d";

  if (!(host instanceof HTMLElement)) return false;
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const isActive = () => seq === activeMountSeq;

  if (rendererReady) {
    if (!isActive()) return false;
    await resetRenderer();
  }
  if (!isActive()) return false;

  host.className =
    "roprime-profile-avatar-preview profile-avatar-background-empty-state";
  host.style.position = "relative";
  host.style.width = "50%";
  host.style.maxWidth = "50%";
  host.style.height = `${PREVIEW_HEIGHT}px`;
  host.style.minHeight = `${PREVIEW_HEIGHT}px`;
  host.style.marginBottom = "24px";
  host.style.borderRadius = "12px";
  host.style.overflow = "hidden";

  let avatarSource = null;
  try {
    avatarSource = await fetchAvatarRenderData(userId);
  } catch {
    if (isActive()) await resetRenderer();
    return false;
  }
  if (!isActive()) return false;
  if (!avatarSource || typeof avatarSource !== "object") {
    if (isActive()) await resetRenderer();
    return false;
  }
  currentAvatarSource = avatarSource;
  currentAvatarType = avatarSource.avatarType || AvatarType.R15;
  return renderCurrentPreview();
}

export async function unmountAvatarPreview() {
  currentHost = null;
  currentUserId = 0;
  currentAvatarSource = null;
  await resetRenderer();
}
