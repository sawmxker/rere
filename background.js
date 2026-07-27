browser.runtime.onInstalled.addListener(() => setTimeout(updateContextMenus, 500));
browser.storage.onChanged.addListener((changes, areaName) => {
    storageInvalidateSyncCache();
    storageGetSyncEnabled().then(syncEnabled => {
        if (syncEnabled && areaName === "sync") {
            storagePullFromSync().then(() => updateContextMenus());
        } else if (!syncEnabled && areaName === "local") {
            updateContextMenus();
        }
    });
});

async function updateContextMenus() {
    await browser.contextMenus.removeAll();

    const data = await storageGet(null);
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
    let result = url
        .replace(/\{query\}/g, query)
        .replace(/\{title\}/g, query);
    if (result.includes('{year}')) {
        result = result.replace(/\{year\}/g, '').replace(/&release_date=[^&]*/g, '');
    }
    return result;
}

let _jikanQueue = Promise.resolve();
let _imdbQueue = Promise.resolve();

async function _rateLimitedFetch(url) {
    const isJikan = url.includes('api.jikan.moe');
    const minGap = isJikan ? 1100 : 500;
    const prev = isJikan ? _jikanQueue : _imdbQueue;

    const next = (async () => {
        await prev;
        await new Promise(r => setTimeout(r, minGap));

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
                if (res.status === 429 || res.status === 504) {
                    await new Promise(r => setTimeout(r, (1 << attempt) * 1000));
                    continue;
                }
                if (!res.ok) return null;
                return await res.json();
            } catch {
                await new Promise(r => setTimeout(r, (1 << attempt) * 1000));
            }
        }
        return null;
    })();

    if (isJikan) _jikanQueue = next;
    else _imdbQueue = next;

    return next;
}

browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === "apiFetch") {
        return _rateLimitedFetch(msg.url);
    }
});

async function jikanSearchAnime(title) {
    try {
        const json = await _rateLimitedFetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=10`);
        if (json && json.data && json.data.length > 0) {
            const exact = json.data.find(item =>
                item.title === title ||
                (item.title_english && item.title_english === title) ||
                (item.title_synonyms && item.title_synonyms.some(s => s === title))
            );
            if (exact) return exact.url;
            const lower = title.toLowerCase();
            const fuzzy = json.data.find(item =>
                item.title.toLowerCase() === lower ||
                (item.title_english && item.title_english.toLowerCase() === lower) ||
                (item.title_synonyms && item.title_synonyms.some(s => s.toLowerCase() === lower))
            );
            if (fuzzy) return fuzzy.url;
            return json.data[0].url;
        }
    } catch {}
    return null;
}

async function imdbSearchTitle(title, year) {
    try {
        const firstLetter = encodeURIComponent(title.charAt(0).toLowerCase());
        const json = await _rateLimitedFetch(`https://v3.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(title)}.json`);
        if (json && json.d && json.d.length > 0) {
            const items = json.d.filter(item => item.id);
            if (items.length === 0) return null;
            if (year) {
                const yearNum = parseInt(year, 10);
                if (!isNaN(yearNum)) {
                    const yearExact = items.find(item => item.y === yearNum && item.l === title);
                    if (yearExact) return `https://www.imdb.com/title/${yearExact.id}/`;
                    const yearFuzzy = items.find(item => item.y === yearNum);
                    if (yearFuzzy) return `https://www.imdb.com/title/${yearFuzzy.id}/`;
                    const yearClose = items.find(item => item.y && Math.abs(item.y - yearNum) <= 1);
                    if (yearClose) return `https://www.imdb.com/title/${yearClose.id}/`;
                }
            }
            const exactTitle = items.find(item => item.l === title);
            if (exactTitle) return `https://www.imdb.com/title/${exactTitle.id}/`;
            const lower = title.toLowerCase();
            const fuzzyTitle = items.find(item => item.l.toLowerCase() === lower);
            if (fuzzyTitle) return `https://www.imdb.com/title/${fuzzyTitle.id}/`;
            return `https://www.imdb.com/title/${items[0].id}/`;
        }
    } catch {}
    return null;
}

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;
    const rawText = info.selectionText.trim();
    const query = encodeURIComponent(rawText);
    const parts = info.menuItemId.split("|");

    if (parts[0] !== "rere" || parts.length < 3) return;

    const type = parts[1];
    const profileId = parts[2];

    if (type !== "p" && type !== "m") return;

    storageGet(null).then(async data => {
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

        const isMalUrl = (item.url || "").toLowerCase().includes("myanimelist.net");
        const isImdbUrl = (item.url || "").toLowerCase().includes("imdb.com");
        const malMode = item.malApiMode || "none";
        const imdbMode = item.imdbApiMode || "none";

        let resolvedUrl = null;

        if (isMalUrl && (malMode === "always" || malMode === "split")) {
            resolvedUrl = await jikanSearchAnime(rawText);
        } else if (isImdbUrl && (imdbMode === "always" || imdbMode === "split")) {
            resolvedUrl = await imdbSearchTitle(rawText, null);
        }

        if (resolvedUrl) {
            browser.tabs.create({ url: resolvedUrl });
        } else {
            const url = resolveUrl(item.url, data, query);
            if (url) browser.tabs.create({ url });
        }
    });
});
