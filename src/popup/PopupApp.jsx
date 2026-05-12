const RP_SETTINGS_URL = "https://www.roblox.com/my/account?roprime=design#!/info";
const RP_DONATE_URL = "https://www.roprime.com/donation";

function openTabAndClose(url) {
    chrome.tabs.create({ url });
    window.close();
}

export function PopupApp() {
    return (
        <main className="rp-popup">
            <section className="rp-popup__card">
                <div className="rp-popup__header">
                    <i className="ri-rocket-2-fill" aria-hidden="true" />
                    <h1 className="rp-popup__title">RoPrime</h1>
                </div>
                <div className="rp-popup__actions">
                    <button
                        type="button"
                        className="rp-popup__btn rp-popup__btn--secondary"
                        onClick={() => openTabAndClose(RP_SETTINGS_URL)}
                    >
                        <i className="ri-settings-3-line" aria-hidden="true" />
                        Open Settings
                    </button>
                    <button
                        type="button"
                        className="rp-popup__btn rp-popup__btn--primary"
                        onClick={() => openTabAndClose(RP_DONATE_URL)}
                    >
                        <i className="ri-heart-3-line" aria-hidden="true" />
                        Donate
                    </button>
                </div>
            </section>
        </main>
    );
}
