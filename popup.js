const RP_SETTINGS_URL = "https://www.roblox.com/my/account?roprime=design";
const RP_DONATE_URL = "https://www.roblox.com/upgrades/robux";

document.getElementById("open-settings")?.addEventListener("click", () => {
    chrome.tabs.create({ url: RP_SETTINGS_URL });
    window.close();
});

document.getElementById("open-donate")?.addEventListener("click", () => {
    chrome.tabs.create({ url: RP_DONATE_URL });
    window.close();
});
