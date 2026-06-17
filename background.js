browser.runtime.onInstalled.addListener(updateContextMenus);
browser.storage.onChanged.addListener(updateContextMenus);

async function updateContextMenus() {
    await browser.contextMenus.removeAll();

    const data = await browser.storage.local.get(null);
    if (data.contextMenuEnabled === false) return;
    const profiles = data.profiles || {};
    const entries = Object.entries(profiles);
    if (entries.length === 0) return;

    browser.contextMenus.create({
        id: "rere-root",
        title: "rer\u00e9:Search",
        contexts: ["selection"]
    });

    for (const [id, profile] of entries) {
        const allItems = [...(profile.menuItems || []), ...(profile.customEngines || [])];
        const profileMenuId = "rere|p|" + id;

        if (allItems.length === 0) {
            browser.contextMenus.create({
                id: profileMenuId,
                parentId: "rere-root",
                title: profile.name || id,
                contexts: ["selection"]
            });
            continue;
        }

        browser.contextMenus.create({
            id: profileMenuId,
            parentId: "rere-root",
            title: profile.name || id,
            contexts: ["selection"]
        });

        for (const item of allItems) {
            browser.contextMenus.create({
                id: "rere|m|" + id + "|" + item.id,
                parentId: profileMenuId,
                title: item.name,
                contexts: ["selection"]
            });
        }
    }
}

function resolveUrl(itemUrl, data, query) {
    let url = itemUrl;
    if (url === "__DEFAULT_ENGINE__") {
        const engineId = data.searchEngineId || data.searchEngine || "google";
        const engines = data.searchEngines || [];
        const engine = engines.find(e => e.id === engineId);
        url = (engine ? engine.url : "https://www.google.com/search?q={query}");
    }
    return url.replace(/\{query\}/g, query);
}

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;
    const query = encodeURIComponent(info.selectionText.trim());
    const parts = info.menuItemId.split("|");

    if (parts[0] !== "rere" || parts.length < 3) return;

    const type = parts[1];
    const profileId = parts[2];

    if (type !== "p" && type !== "m") return;

    browser.storage.local.get(null).then(data => {
        const profiles = data.profiles || {};
        const profile = profiles[profileId];
        if (!profile) return;

        const allItems = [...(profile.menuItems || []), ...(profile.customEngines || [])];

        let item;

        if (type === "p") {
            item = allItems.find(m => m.url === "__DEFAULT_ENGINE__" || m.usesSelectedEngine) || allItems[0];
        } else {
            const itemId = parts.slice(3).join("|");
            item = allItems.find(m => m.id === itemId);
        }

        if (!item || !item.url) return;
        const url = resolveUrl(item.url, data, query);
        if (url) browser.tabs.create({ url });
    });
});
