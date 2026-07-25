window.__RERE_OPTIONS_STATE__ = (function () {
    'use strict';

    const DEFAULT_SEARCH_ENGINES = [
        { id: "google", name: "Google", url: "https://www.google.com/search?q={query}", builtIn: true },
        { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}", builtIn: true },
        { id: "bing", name: "Bing", url: "https://www.bing.com/search?q={query}", builtIn: true }
    ];

    const DEFAULT_MENU_ITEMS = [
        { id: "menu_search", name: "Search in new tab", url: "__DEFAULT_ENGINE__", queryMode: "titleYear", builtIn: true, usesSelectedEngine: true },
        { id: "menu_youtube", name: "Search YouTube", url: "https://www.youtube.com/results?search_query={query}", queryMode: "title", builtIn: true },
        { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true, malApiMode: 'none' },
        { id: "menu_archive", name: "Search Archive.org", url: "https://archive.org/search?tab=all&query={query}", queryMode: "title", builtIn: true },
        { id: "menu_rutracker", name: "Search RuTracker", url: "https://rutracker.org/forum/tracker.php?nm={query}", queryMode: "title", builtIn: true }
    ];

    const DEFAULT_MAL_MENU_ITEMS = [
        { id: "menu_search", name: "Search in new tab", url: "__DEFAULT_ENGINE__", queryMode: "titleYear", builtIn: true, usesSelectedEngine: true },
        { id: "menu_youtube", name: "Search YouTube", url: "https://www.youtube.com/results?search_query={query}", queryMode: "title", builtIn: true },
        { id: 'menu_imdb', name: 'Search IMDb', url: 'https://www.imdb.com/search/title/?title={title}&release_date={year}-01-01,{year}-12-31&adult=include', queryMode: 'title', builtIn: true, imdbApiMode: 'none' },
        { id: "menu_archive", name: "Search Archive.org", url: "https://archive.org/search?tab=all&query={query}", queryMode: "title", builtIn: true },
        { id: "menu_rutracker", name: "Search RuTracker", url: "https://rutracker.org/forum/tracker.php?nm={query}", queryMode: "title", builtIn: true }
    ];

    const SITE_OPTIONS = [
        { value: "\u2014", label: "\u2014" },
        { value: "imdb", label: "imdb" },
        { value: "mal-anime", label: "myanimelist.net/anime" },
        { value: "mal-manga", label: "myanimelist.net/manga" },
        { value: "goodreads", label: "goodreads" }
    ];

    const DEFAULT_PROFILES_CONFIG = [
        { id: "imdb", name: "IMDb", site: "imdb", suffix: "watch", searchQueryMode: "titleYear", menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })), customEngines: [] },
        { id: "mal-anime", name: "MAL anime", site: "mal-anime", suffix: "watch", searchQueryMode: "titleYear", menuItems: DEFAULT_MAL_MENU_ITEMS.map(i => ({ ...i })), customEngines: [] },
        { id: "mal-manga", name: "MAL manga", site: "mal-manga", suffix: "read", searchQueryMode: "titleYear", menuItems: DEFAULT_MAL_MENU_ITEMS.map(i => ({ ...i })), customEngines: [] },
        { id: "goodreads", name: "Goodreads", site: "goodreads", suffix: "read", searchQueryMode: "titleYear", menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })), customEngines: [] }
    ];

    const DEFAULT_SETTINGS = {
        suffix: "watch",
        searchEngineId: "google",
        searchQueryMode: "titleYear",
        searchEngines: DEFAULT_SEARCH_ENGINES,
        menuItems: DEFAULT_MAL_MENU_ITEMS,
        customEngines: []
    };

    const DEFAULT_PROFILE_IDS = DEFAULT_PROFILES_CONFIG.map(p => p.id);

    function cloneProfileConfig(config) {
        return {
            ...config,
            site: config.site || "\u2014",
            menuItems: config.menuItems.map(i => ({ ...i })),
            customEngines: config.customEngines.map(i => ({ ...i }))
        };
    }

    function createDefaultState() {
        const profiles = {};
        DEFAULT_PROFILES_CONFIG.forEach((cfg) => {
            profiles[cfg.id] = cloneProfileConfig(cfg);
        });
        const imdb = profiles["imdb"];
        return {
            suffix: imdb.suffix,
            searchEngineId: DEFAULT_SETTINGS.searchEngineId,
            searchQueryMode: imdb.searchQueryMode,
            searchEngines: DEFAULT_SEARCH_ENGINES.map((item) => ({ ...item })),
            menuItems: imdb.menuItems,
            customEngines: imdb.customEngines,
            profiles,
            activeProfileId: "imdb",
            emptyProfilesByDefault: true,
            collapseDefaultEngines: true,
            collapseQuickSearchMenu: false,
            imdbEnabled: true,
            malEnabled: true,
            grEnabled: true,
            contextMenuEnabled: true,
            imdbButtonLabel: "reresearch",
            malButtonLabel: "reresearch",
            malQuickLink: true,
            searchTitleMode: "original",
            searchTitleModeGR: "edition",
            grSubtleBorder: false
        };
    }

    function makeId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function ensureQueryPlaceholder(url) {
        const trimmed = (url || "").trim();
        if (!trimmed || trimmed === "__DEFAULT_ENGINE__") {
            return trimmed;
        }
        const hasCustom = trimmed.includes("{title}") || trimmed.includes("{year}");
        if (hasCustom) return trimmed;
        return trimmed.includes("{query}") ? trimmed : `${trimmed}{query}`;
    }

    function getQueryText(mode) {
        switch (mode) {
            case "title":
                return "Movie Title";
            case "configured":
            case "titleYear":
            default:
                return "Movie Title 2024";
        }
    }

    function buildSearchUrl(url, mode, suffix = "") {
        if (url === "__DEFAULT_ENGINE__") {
            const selected = getSearchEngineById(state.searchEngineId);
            if (!selected) return "";
            url = selected.url;
            mode = mode === "configured" ? state.searchQueryMode : mode;
        }
        const queryText = [getQueryText(mode), suffix.trim()].filter(Boolean).join(" ");
        const sampleTitle = "Movie Title";
        const sampleYear = "2024";
        return ensureQueryPlaceholder(url)
            .replace("{query}", encodeURIComponent(queryText.trim()))
            .replace(/\{title\}/g, encodeURIComponent(sampleTitle))
            .replace(/\{year\}/g, encodeURIComponent(sampleYear));
    }

    function replaceUrlPlaceholders(url, queryVal, titleVal, yearVal) {
        return url
            .replace(/\{query\}/g, queryVal)
            .replace(/\{title\}/g, titleVal)
            .replace(/\{year\}/g, yearVal);
    }

    function getOriginFromUrl(url) {
        const normalized = url === "__DEFAULT_ENGINE__"
            ? getSearchEngineById(state.searchEngineId)?.url || ""
            : ensureQueryPlaceholder(url);
        try {
            const parsed = new URL(replaceUrlPlaceholders(normalized, "test", "test", "2000"));
            return parsed.origin;
        } catch (error) {
            return "";
        }
    }

    function extractTargetDomainFromQuery(url) {
        try {
            const testUrl = replaceUrlPlaceholders(url, "test", "test", "2000");
            const parsed = new URL(testUrl);
            const queryParams = new URLSearchParams(parsed.search);
            for (const param of ['q', 'query', 'p', 's']) {
                const value = queryParams.get(param);
                if (!value) continue;
                const siteMatch = value.match(/site:([^+\s&]+)/i);
                if (siteMatch && siteMatch[1]) return siteMatch[1];
                const domainMatch = value.match(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z.]{2,})/);
                if (domainMatch && domainMatch[3]) {
                    const domain = domainMatch[3].toLowerCase();
                    const searchDomains = ['google.com', 'duckduckgo.com', 'bing.com', 'yandex.ru', 'yahoo.com'];
                    if (!searchDomains.some(sd => domain.endsWith(sd))) return domain;
                }
            }
        } catch (e) {}
        return null;
    }

    function getFaviconUrl(url) {
        const targetDomain = extractTargetDomainFromQuery(url);
        if (targetDomain) {
            const protocol = url.startsWith('https://') ? 'https:' : 'http:';
            return `${protocol}//${targetDomain}/favicon.ico`;
        }
        const normalized = url === "__DEFAULT_ENGINE__"
            ? getSearchEngineById(state.searchEngineId)?.url || ""
            : ensureQueryPlaceholder(url);
        try {
            const parsed = new URL(replaceUrlPlaceholders(normalized, "test", "test", "2000"));
            return `${parsed.origin}/favicon.ico`;
        } catch (error) {
            return "";
        }
    }

    function extractDomainsFromUrl(url) {
        const domains = [];
        try {
            const testUrl = replaceUrlPlaceholders(url, "test", "test", "2000");
            const parsed = new URL(testUrl);
            const mainDomain = parsed.hostname.replace(/^www\./, "");
            if (mainDomain) domains.push(mainDomain);
            const queryParams = new URLSearchParams(parsed.search);
            for (const [, value] of queryParams) {
                const siteMatch = value.match(/site:([^+\s&]+)/i);
                if (siteMatch && siteMatch[1]) {
                    const d = siteMatch[1].replace(/^www\./, "").toLowerCase();
                    if (!domains.includes(d)) domains.push(d);
                }
                const urlMatches = value.matchAll(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z.]{2,})/g);
                for (const match of urlMatches) {
                    const d = match[3].toLowerCase().replace(/^www\./, "");
                    if (!domains.includes(d)) domains.push(d);
                }
            }
        } catch (e) {}
        return domains;
    }

    function isValidHttpUrl(url) {
        const normalized = ensureQueryPlaceholder(url);
        if (!normalized || normalized === "__DEFAULT_ENGINE__") return false;
        try {
            const parsed = new URL(replaceUrlPlaceholders(normalized, "test", "test", "2000"));
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch (error) {
            return false;
        }
    }

    function normalizeQueryMode(mode, fallback = "titleYear") {
        return ["title", "titleYear", "configured"].includes(mode) ? mode : fallback;
    }

    function normalizeSearchEngine(raw, fallback = {}) {
        return {
            id: raw?.id || fallback.id || makeId("engine"),
            name: (raw?.name || fallback.name || "Search Engine").trim(),
            url: ensureQueryPlaceholder(raw?.url || fallback.url || ""),
            builtIn: Boolean(raw?.builtIn ?? fallback.builtIn),
            iconUrl: raw?.iconUrl || ""
        };
    }

    function normalizeMenuItem(raw, fallback = {}) {
        const url = raw?.usesSelectedEngine ? "__DEFAULT_ENGINE__" : raw?.url ?? fallback.url ?? "";
        const rawMalMode = raw?.malApiMode || fallback.malApiMode || "none";
        const rawImdbMode = raw?.imdbApiMode || fallback.imdbApiMode || "none";
        return {
            id: raw?.id || fallback.id || makeId("menu"),
            name: (raw?.name || fallback.name || "Quick Search Item").trim(),
            url: url === "__DEFAULT_ENGINE__" ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(url),
            queryMode: normalizeQueryMode(raw?.queryMode, fallback.queryMode || "titleYear"),
            builtIn: Boolean(raw?.builtIn ?? fallback.builtIn),
            usesSelectedEngine: url === "__DEFAULT_ENGINE__" || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine),
            iconUrl: raw?.iconUrl || "",
            malApiMode: ["none", "split", "always"].includes(rawMalMode) ? rawMalMode : "none",
            imdbApiMode: ["none", "split", "always"].includes(rawImdbMode) ? rawImdbMode : "none"
        };
    }

    function normalizeCustomEngine(raw) {
        return {
            id: raw?.id || makeId("custom"),
            name: (raw?.name || "Custom Search").trim(),
            url: ensureQueryPlaceholder(raw?.url || ""),
            queryMode: normalizeQueryMode(raw?.queryMode, "titleYear"),
            iconUrl: raw?.iconUrl || "",
            malApiMode: ["none", "split", "always"].includes(raw?.malApiMode) ? raw.malApiMode : "none",
            imdbApiMode: ["none", "split", "always"].includes(raw?.imdbApiMode) ? raw.imdbApiMode : "none"
        };
    }

    function normalizeSettings(raw) {
        const next = createDefaultState();
        const rawSearchEngines = Array.isArray(raw.searchEngines) && raw.searchEngines.length > 0
            ? raw.searchEngines
            : DEFAULT_SEARCH_ENGINES;
        next.searchEngines = rawSearchEngines.map((item, index) =>
            normalizeSearchEngine(item, DEFAULT_SEARCH_ENGINES[index] || DEFAULT_SEARCH_ENGINES[0])
        );
        if (!Array.isArray(raw.searchEngines) && raw.searchEngine === "custom" && raw.customSearchUrl) {
            const migratedId = "custom_migrated_default";
            next.searchEngines.push({
                id: migratedId, name: "Migrated Custom URL",
                url: ensureQueryPlaceholder(raw.customSearchUrl), builtIn: false
            });
            next.searchEngineId = migratedId;
        } else {
            const fallbackId = raw.searchEngineId || raw.searchEngine || DEFAULT_SETTINGS.searchEngineId;
            next.searchEngineId = next.searchEngines.some((engine) => engine.id === fallbackId)
                ? fallbackId
                : next.searchEngines[0]?.id || DEFAULT_SETTINGS.searchEngineId;
        }
        if (raw.profiles && typeof raw.profiles === "object") {
            next.activeProfileId = DEFAULT_PROFILE_IDS.includes(raw.activeProfileId)
                ? raw.activeProfileId : "imdb";
            DEFAULT_PROFILES_CONFIG.forEach((def) => {
                const existing = raw.profiles[def.id];
                if (existing) {
                    let migratedItems;
                    if (Array.isArray(existing.menuItems) && existing.menuItems.length > 0) {
                        migratedItems = existing.menuItems.map((item, index) => normalizeMenuItem(item, def.menuItems[index] || def.menuItems[0]));
                        if (def.id.startsWith("mal-")) {
                            migratedItems = migratedItems.filter(i => i.id !== "menu_mal");
                            if (!migratedItems.some(i => i.id === "menu_imdb")) {
                                migratedItems.unshift({
                                    id: "menu_imdb", name: "Search IMDb",
                                    url: "https://www.imdb.com/find/?q={query}", queryMode: "titleYear",
                                    builtIn: true, imdbApiMode: "none", usesSelectedEngine: false, iconUrl: ""
                                });
                            }
                        }
                    } else {
                        migratedItems = def.menuItems.map(i => ({ ...i }));
                    }
                    next.profiles[def.id] = {
                        id: def.id, name: existing.name || def.name,
                        site: SITE_OPTIONS.some(s => s.value === existing.site) ? existing.site : (def.site || "\u2014"),
                        suffix: typeof existing.suffix === "string" ? existing.suffix : def.suffix,
                        searchQueryMode: normalizeQueryMode(existing.searchQueryMode, def.searchQueryMode),
                        menuItems: migratedItems,
                        customEngines: Array.isArray(existing.customEngines)
                            ? existing.customEngines.map(normalizeCustomEngine) : []
                    };
                }
            });
            Object.keys(raw.profiles).forEach((id) => {
                if (!DEFAULT_PROFILE_IDS.includes(id) && raw.profiles[id]) {
                    const rp = raw.profiles[id];
                    next.profiles[id] = {
                        id, name: rp.name || id,
                        site: SITE_OPTIONS.some(s => s.value === rp.site) ? rp.site : "\u2014",
                        suffix: typeof rp.suffix === "string" ? rp.suffix : DEFAULT_SETTINGS.suffix,
                        searchQueryMode: normalizeQueryMode(rp.searchQueryMode, DEFAULT_SETTINGS.searchQueryMode),
                        menuItems: Array.isArray(rp.menuItems)
                            ? rp.menuItems.map((item, index) => normalizeMenuItem(item, DEFAULT_MENU_ITEMS[0])) : [],
                        customEngines: Array.isArray(rp.customEngines)
                            ? rp.customEngines.map(normalizeCustomEngine) : []
                    };
                }
            });
        } else {
            const rawMenuItems = Array.isArray(raw.menuItems) && raw.menuItems.length > 0
                ? raw.menuItems : DEFAULT_MENU_ITEMS;
            const rawCustomEngines = Array.isArray(raw.customEngines) ? raw.customEngines : [];
            const migratedMenuItems = rawMenuItems.map((item, index) =>
                normalizeMenuItem(item, DEFAULT_MENU_ITEMS[index] || DEFAULT_MENU_ITEMS[0])
            );
            const migratedCustomEngines = rawCustomEngines.map(normalizeCustomEngine);
            next.profiles["imdb"].suffix = typeof raw.suffix === "string" ? raw.suffix : DEFAULT_SETTINGS.suffix;
            next.profiles["imdb"].searchQueryMode = normalizeQueryMode(raw.searchQueryMode, DEFAULT_SETTINGS.searchQueryMode);
            next.profiles["imdb"].menuItems = migratedMenuItems;
            next.profiles["imdb"].customEngines = migratedCustomEngines;
            next.activeProfileId = "imdb";
        }
        if (typeof raw.emptyProfilesByDefault === "boolean") next.emptyProfilesByDefault = raw.emptyProfilesByDefault;
        if (typeof raw.collapseDefaultEngines === "boolean") next.collapseDefaultEngines = raw.collapseDefaultEngines;
        if (typeof raw.collapseQuickSearchMenu === "boolean") next.collapseQuickSearchMenu = raw.collapseQuickSearchMenu;
        if (typeof raw.imdbEnabled === "boolean") next.imdbEnabled = raw.imdbEnabled;
        if (typeof raw.malEnabled === "boolean") next.malEnabled = raw.malEnabled;
        if (typeof raw.grEnabled === "boolean") next.grEnabled = raw.grEnabled;
        if (typeof raw.grSubtleBorder === "boolean") next.grSubtleBorder = raw.grSubtleBorder;
        if (typeof raw.contextMenuEnabled === "boolean") next.contextMenuEnabled = raw.contextMenuEnabled;
        if (raw.imdbButtonLabel === "search" || raw.imdbButtonLabel === "reresearch") next.imdbButtonLabel = raw.imdbButtonLabel;
        if (raw.malButtonLabel === "search" || raw.malButtonLabel === "reresearch") next.malButtonLabel = raw.malButtonLabel;
        if (typeof raw.malQuickLink === "boolean") next.malQuickLink = raw.malQuickLink;
        if (raw.searchTitleMode === "original" || raw.searchTitleMode === "english") next.searchTitleMode = raw.searchTitleMode;
        if (raw.searchTitleModeGR === "edition" || raw.searchTitleModeGR === "original") next.searchTitleModeGR = raw.searchTitleModeGR;
        const active = next.profiles[next.activeProfileId];
        if (active) {
            next.suffix = active.suffix;
            next.searchQueryMode = active.searchQueryMode;
            next.menuItems = active.menuItems;
            next.customEngines = active.customEngines;
        }
        return next;
    }

    function serializeSettings() {
        const profile = getActiveProfile();
        if (profile) {
            profile.suffix = state.suffix;
            profile.searchQueryMode = state.searchQueryMode;
            profile.menuItems = state.menuItems;
            profile.customEngines = state.customEngines;
        }
        const serializedProfiles = {};
        Object.keys(state.profiles).forEach((id) => {
            const p = state.profiles[id];
            serializedProfiles[id] = {
                id: p.id, name: p.name, site: p.site || "\u2014",
                suffix: p.suffix, searchQueryMode: p.searchQueryMode,
                menuItems: p.menuItems.map((item) => ({
                    id: item.id, name: item.name.trim(),
                    url: item.usesSelectedEngine ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(item.url),
                    queryMode: normalizeQueryMode(item.queryMode),
                    builtIn: Boolean(item.builtIn),
                    usesSelectedEngine: Boolean(item.usesSelectedEngine),
                    iconUrl: item.iconUrl || "",
                    malApiMode: item.malApiMode || "none",
                    imdbApiMode: item.imdbApiMode || "none"
                })),
                customEngines: p.customEngines.map((item) => ({
                    id: item.id, name: item.name.trim(),
                    url: ensureQueryPlaceholder(item.url),
                    queryMode: normalizeQueryMode(item.queryMode),
                    iconUrl: item.iconUrl || "",
                    malApiMode: item.malApiMode || "none",
                    imdbApiMode: item.imdbApiMode || "none"
                }))
            };
        });
        return {
            searchEngineId: state.searchEngineId,
            searchEngine: state.searchEngineId,
            searchEngines: state.searchEngines.map((item) => ({
                id: item.id, name: item.name.trim(),
                url: ensureQueryPlaceholder(item.url),
                builtIn: Boolean(item.builtIn)
            })),
            activeProfileId: state.activeProfileId,
            profiles: serializedProfiles,
            suffix: state.suffix,
            searchQueryMode: state.searchQueryMode,
            menuItems: state.menuItems.map((item) => ({
                id: item.id, name: item.name.trim(),
                url: item.usesSelectedEngine ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(item.url),
                queryMode: normalizeQueryMode(item.queryMode),
                builtIn: Boolean(item.builtIn),
                usesSelectedEngine: Boolean(item.usesSelectedEngine),
                iconUrl: item.iconUrl || "",
                malApiMode: item.malApiMode || "none",
                imdbApiMode: item.imdbApiMode || "none"
            })),
            customEngines: state.customEngines.map((item) => ({
                id: item.id, name: item.name.trim(),
                url: ensureQueryPlaceholder(item.url),
                queryMode: normalizeQueryMode(item.queryMode),
                iconUrl: item.iconUrl || "",
                malApiMode: item.malApiMode || "none",
                imdbApiMode: item.imdbApiMode || "none"
            })),
            customSearchUrl: "",
            emptyProfilesByDefault: state.emptyProfilesByDefault,
            collapseDefaultEngines: state.collapseDefaultEngines,
            collapseQuickSearchMenu: state.collapseQuickSearchMenu,
            imdbEnabled: state.imdbEnabled,
            malEnabled: state.malEnabled,
            grEnabled: state.grEnabled,
            contextMenuEnabled: state.contextMenuEnabled,
            imdbButtonLabel: state.imdbButtonLabel,
            malButtonLabel: state.malButtonLabel,
            malQuickLink: state.malQuickLink,
            searchTitleMode: state.searchTitleMode,
            searchTitleModeGR: state.searchTitleModeGR,
            grSubtleBorder: state.grSubtleBorder
        };
    }

    function moveItem(items, index, direction) {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= items.length) return items;
        const nextItems = [...items];
        [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
        return nextItems;
    }

    let _activeProfileId = "imdb";
    let _searchEngines = DEFAULT_SEARCH_ENGINES;

    let state = null;

    function initState(s) { state = s; }

    function getSearchEngineById(id) {
        const engines = state ? state.searchEngines : _searchEngines;
        return engines.find((item) => item.id === id) || engines[0];
    }

    function getActiveProfile() {
        if (!state || !state.profiles) return null;
        return state.profiles[state.activeProfileId] || state.profiles["imdb"] || state.profiles[Object.keys(state.profiles)[0]];
    }

    function saveCurrentProfileToState() {
        const profile = getActiveProfile();
        if (!profile) return;
        profile.suffix = state.suffix;
        profile.searchQueryMode = state.searchQueryMode;
        profile.menuItems = state.menuItems;
        profile.customEngines = state.customEngines;
    }

    function loadProfileIntoState(profile) {
        if (!profile) return;
        state.suffix = profile.suffix;
        state.searchQueryMode = profile.searchQueryMode;
        state.menuItems = profile.menuItems;
        state.customEngines = profile.customEngines;
    }

    function createFallbackIcon(label) {
        const fallback = document.createElement("div");
        fallback.className = "engine-icon-fallback";
        fallback.textContent = (label || "?").trim().charAt(0) || "?";
        return fallback;
    }

    function createFaviconElement(url, label) {
        const iconUrl = getFaviconUrl(url);
        if (!iconUrl) return createFallbackIcon(label);
        const img = document.createElement("img");
        img.className = "engine-icon";
        img.src = iconUrl;
        img.alt = `${label} favicon`;
        img.referrerPolicy = "no-referrer";
        img.onerror = () => img.replaceWith(createFallbackIcon(label));
        return img;
    }

    function isProfileDuplicate(profile) {
        const normalized = {
            site: SITE_OPTIONS.some(s => s.value === profile.site) ? profile.site : "\u2014",
            suffix: typeof profile.suffix === "string" ? profile.suffix : state.suffix,
            searchQueryMode: normalizeQueryMode(profile.searchQueryMode, state.searchQueryMode),
            menuItems: Array.isArray(profile.menuItems)
                ? profile.menuItems.map(m => normalizeMenuItem(m, DEFAULT_MENU_ITEMS[0])) : null,
            customEngines: Array.isArray(profile.customEngines)
                ? profile.customEngines.map(normalizeCustomEngine) : []
        };
        const needle = JSON.stringify(normalized);
        return Object.values(state.profiles).some(p => {
            const existing = { site: p.site, suffix: p.suffix, searchQueryMode: p.searchQueryMode, menuItems: p.menuItems, customEngines: p.customEngines };
            return JSON.stringify(existing) === needle;
        });
    }

    function addImportedProfile(profile) {
        if (isProfileDuplicate(profile)) return null;
        let newName = profile.name || "Imported";
        const existingNames = Object.values(state.profiles).map(p => p.name);
        if (existingNames.includes(newName)) {
            let counter = 2;
            while (existingNames.includes(newName + " (" + counter + ")")) counter++;
            newName = newName + " (" + counter + ")";
        }
        const newId = makeId("imported");
        state.profiles[newId] = {
            id: newId, name: newName,
            site: SITE_OPTIONS.some(s => s.value === profile.site) ? profile.site : "\u2014",
            suffix: typeof profile.suffix === "string" ? profile.suffix : state.suffix,
            searchQueryMode: normalizeQueryMode(profile.searchQueryMode, state.searchQueryMode),
            menuItems: Array.isArray(profile.menuItems)
                ? profile.menuItems.map(m => normalizeMenuItem(m, DEFAULT_MENU_ITEMS[0]))
                : state.menuItems.map(i => ({ ...i })),
            customEngines: Array.isArray(profile.customEngines)
                ? profile.customEngines.map(normalizeCustomEngine) : []
        };
        return newId;
    }

    function importData(data) {
        let firstNewId = null;
        let added = 0;
        let skipped = 0;
        if (Array.isArray(data.searchEngines)) {
            for (const engine of data.searchEngines) {
                if (!state.searchEngines.some(e => e.id === engine.id)) {
                    state.searchEngines.push(normalizeSearchEngine(engine, engine));
                }
            }
        }
        if (data.profiles && typeof data.profiles === "object") {
            for (const [, profile] of Object.entries(data.profiles)) {
                const newId = addImportedProfile(profile);
                if (newId) { added++; if (!firstNewId) firstNewId = newId; }
                else skipped++;
            }
        }
        if (data.name && !data.profiles) {
            const newId = addImportedProfile(data);
            if (newId) { added++; if (!firstNewId) firstNewId = newId; }
            else skipped++;
        }
        return { firstNewId, added, skipped };
    }

    return {
        DEFAULT_SEARCH_ENGINES, DEFAULT_MENU_ITEMS, DEFAULT_MAL_MENU_ITEMS,
        SITE_OPTIONS, DEFAULT_PROFILES_CONFIG, DEFAULT_SETTINGS, DEFAULT_PROFILE_IDS,
        cloneProfileConfig, createDefaultState, makeId,
        ensureQueryPlaceholder, getQueryText, buildSearchUrl,
        replaceUrlPlaceholders, getOriginFromUrl, extractTargetDomainFromQuery,
        getFaviconUrl, extractDomainsFromUrl, isValidHttpUrl,
        normalizeQueryMode, normalizeSearchEngine, normalizeMenuItem, normalizeCustomEngine,
        normalizeSettings, serializeSettings, moveItem,
        getSearchEngineById, getActiveProfile, saveCurrentProfileToState, loadProfileIntoState,
        createFallbackIcon, createFaviconElement,
        isProfileDuplicate, addImportedProfile, importData,
        initState, get state() { return state; }, set state(s) { state = s; }
    };
})();
