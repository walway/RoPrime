const RP_SETTINGS_URL = "https://www.roblox.com/my/account?roprime=design";
const RP_DONATE_URL = "https://www.roprime.com/donation";

function openTabAndClose(url) {
    chrome.tabs.create({ url });
    window.close();
}

export function PopupApp() {
    return (
        <main className="flex min-h-[220px] w-[300px] items-center justify-center bg-slate-950 p-4 text-slate-100">
            <section className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/40">
                <div className="mb-4 flex items-center justify-center gap-2">
                    <i className="ri-rocket-2-fill text-sky-400" />
                    <h1 className="text-center text-xl font-bold tracking-tight">RoPrime</h1>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600"
                        onClick={() => openTabAndClose(RP_SETTINGS_URL)}
                    >
                        <i className="ri-settings-3-line" />
                        Open Settings
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        onClick={() => openTabAndClose(RP_DONATE_URL)}
                    >
                        <i className="ri-heart-3-line" />
                        Donate
                    </button>
                </div>
            </section>
        </main>
    );
}

