export const RP_SETTINGS_PAGE_CONTENT_CLASS = "roprime-settings-page-content";
export const RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS =
  "roprime-settings-page-user-account";
const RP_SETTINGS_HOST_ACTIVE_ATTR = "data-roprime-settings-host-active";

function findAccountContainerMain() {
  const el = document.querySelector("main.container-main");
  return el instanceof HTMLElement ? el : null;
}

function findNativeContentRoot() {
  const containerMain = findAccountContainerMain();
  if (!containerMain) return null;
  return (
    containerMain.querySelector("#content.content") ||
    containerMain.querySelector(".content#content") ||
    containerMain.querySelector("#content") ||
    containerMain.querySelector(".content")
  );
}

function applySettingsPageLayout(accountBase) {
  const content =
    accountBase.closest(".content, #content") || findNativeContentRoot();
  if (content instanceof HTMLElement) {
    content.classList.add(RP_SETTINGS_PAGE_CONTENT_CLASS);
  }

  const userAccount = document.getElementById("user-account");
  if (userAccount instanceof HTMLElement) {
    userAccount.classList.add(RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS);
  }

  const containerMain = findAccountContainerMain();
  if (containerMain instanceof HTMLElement) {
    containerMain.setAttribute(RP_SETTINGS_HOST_ACTIVE_ATTR, "1");
  }
}

export function clearSettingsPageLayout() {
  document
    .querySelectorAll(`.${RP_SETTINGS_PAGE_CONTENT_CLASS}`)
    .forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.remove(RP_SETTINGS_PAGE_CONTENT_CLASS);
      }
    });
  document
    .querySelectorAll(`.${RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS}`)
    .forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.remove(RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS);
      }
    });
  findAccountContainerMain()?.removeAttribute(RP_SETTINGS_HOST_ACTIVE_ATTR);
}

function buildAccountScaffoldInContainerMain() {
  const containerMain = findAccountContainerMain();
  if (!containerMain) return null;

  const existingBase = containerMain.querySelector("#react-user-account-base");
  if (existingBase instanceof HTMLElement) {
    applySettingsPageLayout(existingBase);
    return existingBase;
  }

  let content = findNativeContentRoot();
  if (!(content instanceof HTMLElement)) {
    content = document.createElement("div");
    content.className = `content ${RP_SETTINGS_PAGE_CONTENT_CLASS}`;
    content.id = "content";
    containerMain.appendChild(content);
  } else {
    content.classList.add(RP_SETTINGS_PAGE_CONTENT_CLASS);
  }

  let userAccount = content.querySelector("#user-account");
  if (!(userAccount instanceof HTMLElement)) {
    userAccount = document.createElement("div");
    userAccount.className = `row page-content new-username-pwd-rule ${RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS}`;
    userAccount.id = "user-account";
    content.appendChild(userAccount);
  } else {
    userAccount.classList.add(RP_SETTINGS_PAGE_USER_ACCOUNT_CLASS);
  }

  let accountBase = userAccount.querySelector("#react-user-account-base");
  if (!(accountBase instanceof HTMLElement)) {
    accountBase = document.createElement("div");
    accountBase.id = "react-user-account-base";
    userAccount.appendChild(accountBase);
  }

  containerMain.setAttribute(RP_SETTINGS_HOST_ACTIVE_ATTR, "1");
  return accountBase;
}

/**
 * Resolves the mount node for RoPrime settings using Roblox's account `.content`
 * scaffold (same placement pattern as RoValra's settings UI, without copying markup).
 */
export function resolveSettingsMountHost() {
  const userAccount = document.getElementById("user-account");
  if (userAccount instanceof HTMLElement) {
    const nested = userAccount.querySelector("#react-user-account-base");
    if (nested instanceof HTMLElement) {
      applySettingsPageLayout(nested);
      return nested;
    }
  }

  const accountBase = document.getElementById("react-user-account-base");
  if (accountBase instanceof HTMLElement) {
    applySettingsPageLayout(accountBase);
    return accountBase;
  }

  return buildAccountScaffoldInContainerMain();
}
