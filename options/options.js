
const DEFAULT_SEARCH_ENGINES = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q={query}", builtIn: true },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}", builtIn: true },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q={query}", builtIn: true }
];

const DEFAULT_MENU_ITEMS = [
    { id: "menu_search", name: "Search in new tab", url: "__DEFAULT_ENGINE__", queryMode: "titleYear", builtIn: true, usesSelectedEngine: true },
    { id: "menu_youtube", name: "Search YouTube", url: "https://www.youtube.com/results?search_query={query}", queryMode: "title", builtIn: true },
    { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true },
    { id: "menu_archive", name: "Search Archive.org", url: "https://archive.org/search?tab=all&query={query}", queryMode: "title", builtIn: true },
    { id: "menu_rutracker", name: "Search RuTracker", url: "https://rutracker.org/forum/tracker.php?nm={query}", queryMode: "titleYear", builtIn: true }
];

const SITE_OPTIONS = [
    { value: "\u2014", label: "\u2014" },
    { value: "imdb", label: "imdb" },
    { value: "mal-anime", label: "myanimelist.net anime" },
    { value: "mal-manga", label: "myanimelist.net manga" }
];

const DEFAULT_PROFILES_CONFIG = [
    {
        id: "imdb",
        name: "IMDb",
        site: "imdb",
        suffix: "watch",
        searchQueryMode: "titleYear",
        menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })),
        customEngines: []
    },
    {
        id: "mal-anime",
        name: "MAL anime",
        site: "mal-anime",
        suffix: "watch",
        searchQueryMode: "titleYear",
        menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })),
        customEngines: []
    },
    {
        id: "mal-manga",
        name: "MAL manga",
        site: "mal-manga",
        suffix: "read",
        searchQueryMode: "titleYear",
        menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })),
        customEngines: []
    }
];

function cloneProfileConfig(config) {
    return {
        ...config,
        site: config.site || "\u2014",
        menuItems: config.menuItems.map(i => ({ ...i })),
        customEngines: config.customEngines.map(i => ({ ...i }))
    };
}

const DEFAULT_SETTINGS = {
    suffix: "watch",
    searchEngineId: "google",
    searchQueryMode: "titleYear",
    searchEngines: DEFAULT_SEARCH_ENGINES,
    menuItems: DEFAULT_MENU_ITEMS,
    customEngines: []
};

const DEFAULT_PROFILE_IDS = DEFAULT_PROFILES_CONFIG.map(p => p.id);

const YANDEX_DOMAINS = [
    "yandex.com",
    "yandex.ru",
    "yandex.by",
    "yandex.kz",
    "yandex.ua",
    "yandex.com.tr",
    "ya.ru",
    "kinopoisk.ru"
];

let state = createDefaultState();
let isDirty = false;

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
        contextMenuEnabled: true,
        imdbButtonLabel: "reresearch",
        malButtonLabel: "reresearch"
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
        if (!selected) {
            return "";
        }
        url = selected.url;
        mode = mode === "configured" ? state.searchQueryMode : mode;
    }

    const queryText = [getQueryText(mode), suffix.trim()].filter(Boolean).join(" ");
    return ensureQueryPlaceholder(url).replace("{query}", encodeURIComponent(queryText.trim()));
}

function getOriginFromUrl(url) {
    const normalized = url === "__DEFAULT_ENGINE__"
        ? getSearchEngineById(state.searchEngineId)?.url || ""
        : ensureQueryPlaceholder(url);

    try {
        const parsed = new URL(normalized.replace("{query}", "test"));
        return parsed.origin;
    } catch (error) {
        return "";
    }
}

function extractTargetDomainFromQuery(url) {
    try {
        const testUrl = url.replace("{query}", "test");
        const parsed = new URL(testUrl);
        const queryParams = new URLSearchParams(parsed.search);
        for (const param of ['q', 'query', 'p', 's']) {
            const value = queryParams.get(param);
            if (!value) continue;
            const siteMatch = value.match(/site:([^+\s&]+)/i);
            if (siteMatch && siteMatch[1]) {
                return siteMatch[1];
            }
            
            const domainMatch = value.match(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z.]{2,})/);
            if (domainMatch && domainMatch[3]) {
                const domain = domainMatch[3].toLowerCase();
                const searchDomains = ['google.com', 'duckduckgo.com', 'bing.com', 'yandex.ru', 'yahoo.com'];
                if (!searchDomains.some(sd => domain.endsWith(sd))) {
                    return domain;
                }
            }
        }
    } catch (e) {
    }
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
        const parsed = new URL(normalized.replace("{query}", "test"));
        return `${parsed.origin}/favicon.ico`;
    } catch (error) {
        return "";
    }
}

function extractDomainsFromUrl(url) {
    const domains = [];
    try {
        const testUrl = url.replace("{query}", "test");
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

function isYandexUrl(url) {
    const lower = (url || "").toLowerCase();
    return YANDEX_DOMAINS.some((domain) => lower.includes(domain));
}

function getYandexWarningHtml() {
    return `
        <div class="warning-title">Warning: Yandex Search Engine Detected</div>
        <div class="warning-item"><strong>Restricted access:</strong> a large part of resources may be unavailable or suppressed due to current Russian legislation and filtering practices.</div>
        <div class="warning-item"><strong>Regional bias:</strong> results are strongly tied to local region settings and can be much worse for foreign-language or non-Russian sources.</div>
        <div class="warning-item"><strong>Commercial and platform bias:</strong> official and independent resources can be buried under ads and Yandex-owned pages.</div>
    `;
}

function isValidHttpUrl(url) {
    const normalized = ensureQueryPlaceholder(url);
    if (!normalized || normalized === "__DEFAULT_ENGINE__") {
        return false;
    }
    try {
        const parsed = new URL(normalized.replace("{query}", "test"));
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
        builtIn: Boolean(raw?.builtIn ?? fallback.builtIn)
    };
}

function normalizeMenuItem(raw, fallback = {}) {
    const url = raw?.usesSelectedEngine ? "__DEFAULT_ENGINE__" : raw?.url ?? fallback.url ?? "";
    return {
        id: raw?.id || fallback.id || makeId("menu"),
        name: (raw?.name || fallback.name || "Quick Search Item").trim(),
        url: url === "__DEFAULT_ENGINE__" ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(url),
        queryMode: normalizeQueryMode(raw?.queryMode, fallback.queryMode || "titleYear"),
        builtIn: Boolean(raw?.builtIn ?? fallback.builtIn),
        usesSelectedEngine: url === "__DEFAULT_ENGINE__" || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine),
        iconUrl: raw?.iconUrl || ""
    };
}

function normalizeCustomEngine(raw) {
    return {
        id: raw?.id || makeId("custom"),
        name: (raw?.name || "Custom Search").trim(),
        url: ensureQueryPlaceholder(raw?.url || ""),
        queryMode: normalizeQueryMode(raw?.queryMode, "titleYear"),
        iconUrl: raw?.iconUrl || ""
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
            id: migratedId,
            name: "Migrated Custom URL",
            url: ensureQueryPlaceholder(raw.customSearchUrl),
            builtIn: false
        });
        next.searchEngineId = migratedId;
    } else {
        const fallbackId = raw.searchEngineId || raw.searchEngine || DEFAULT_SETTINGS.searchEngineId;
        next.searchEngineId = next.searchEngines.some((engine) => engine.id === fallbackId)
            ? fallbackId
            : next.searchEngines[0]?.id || DEFAULT_SETTINGS.searchEngineId;
    }

    // --- Profile handling ---
    if (raw.profiles && typeof raw.profiles === "object") {
        next.activeProfileId = DEFAULT_PROFILE_IDS.includes(raw.activeProfileId)
            ? raw.activeProfileId
            : "imdb";
        DEFAULT_PROFILES_CONFIG.forEach((def) => {
            const existing = raw.profiles[def.id];
            if (existing) {
                next.profiles[def.id] = {
                    id: def.id,
                    name: existing.name || def.name,
                    site: SITE_OPTIONS.some(s => s.value === existing.site) ? existing.site : (def.site || "\u2014"),
                    suffix: typeof existing.suffix === "string" ? existing.suffix : def.suffix,
                    searchQueryMode: normalizeQueryMode(existing.searchQueryMode, def.searchQueryMode),
                    menuItems: Array.isArray(existing.menuItems) && existing.menuItems.length > 0
                        ? existing.menuItems.map((item, index) => normalizeMenuItem(item, def.menuItems[index] || def.menuItems[0]))
                        : def.menuItems.map(i => ({ ...i })),
                    customEngines: Array.isArray(existing.customEngines)
                        ? existing.customEngines.map(normalizeCustomEngine)
                        : []
                };
            }
        });
        Object.keys(raw.profiles).forEach((id) => {
            if (!DEFAULT_PROFILE_IDS.includes(id) && raw.profiles[id]) {
                const rp = raw.profiles[id];
                next.profiles[id] = {
                    id,
                    name: rp.name || id,
                    site: SITE_OPTIONS.some(s => s.value === rp.site) ? rp.site : "\u2014",
                    suffix: typeof rp.suffix === "string" ? rp.suffix : DEFAULT_SETTINGS.suffix,
                    searchQueryMode: normalizeQueryMode(rp.searchQueryMode, DEFAULT_SETTINGS.searchQueryMode),
                    menuItems: Array.isArray(rp.menuItems)
                        ? rp.menuItems.map((item, index) => normalizeMenuItem(item, DEFAULT_MENU_ITEMS[0]))
                        : [],
                    customEngines: Array.isArray(rp.customEngines)
                        ? rp.customEngines.map(normalizeCustomEngine)
                        : []
                };
            }
        });
    } else {
        // Migration from flat format
        const rawMenuItems = Array.isArray(raw.menuItems) && raw.menuItems.length > 0
            ? raw.menuItems
            : DEFAULT_MENU_ITEMS;
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

    if (typeof raw.emptyProfilesByDefault === "boolean") {
        next.emptyProfilesByDefault = raw.emptyProfilesByDefault;
    }
    if (typeof raw.collapseDefaultEngines === "boolean") {
        next.collapseDefaultEngines = raw.collapseDefaultEngines;
    }
    if (typeof raw.collapseQuickSearchMenu === "boolean") {
        next.collapseQuickSearchMenu = raw.collapseQuickSearchMenu;
    }
    if (typeof raw.imdbEnabled === "boolean") next.imdbEnabled = raw.imdbEnabled;
    if (typeof raw.malEnabled === "boolean") next.malEnabled = raw.malEnabled;
    if (typeof raw.contextMenuEnabled === "boolean") next.contextMenuEnabled = raw.contextMenuEnabled;
    if (raw.imdbButtonLabel === "search" || raw.imdbButtonLabel === "reresearch") next.imdbButtonLabel = raw.imdbButtonLabel;
    if (raw.malButtonLabel === "search" || raw.malButtonLabel === "reresearch") next.malButtonLabel = raw.malButtonLabel;

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
            id: p.id,
            name: p.name,
            site: p.site || "\u2014",
            suffix: p.suffix,
            searchQueryMode: p.searchQueryMode,
            menuItems: p.menuItems.map((item) => ({
                id: item.id,
                name: item.name.trim(),
                url: item.usesSelectedEngine ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(item.url),
                queryMode: normalizeQueryMode(item.queryMode),
                builtIn: Boolean(item.builtIn),
                usesSelectedEngine: Boolean(item.usesSelectedEngine),
                iconUrl: item.iconUrl || ""
            })),
            customEngines: p.customEngines.map((item) => ({
                id: item.id,
                name: item.name.trim(),
                url: ensureQueryPlaceholder(item.url),
                queryMode: normalizeQueryMode(item.queryMode),
                iconUrl: item.iconUrl || ""
            }))
        };
    });

    return {
        searchEngineId: state.searchEngineId,
        searchEngine: state.searchEngineId,
        searchEngines: state.searchEngines.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: ensureQueryPlaceholder(item.url),
            builtIn: Boolean(item.builtIn)
        })),
        activeProfileId: state.activeProfileId,
        profiles: serializedProfiles,
        // flat legacy fields for backward compat
        suffix: state.suffix,
        searchQueryMode: state.searchQueryMode,
        menuItems: state.menuItems.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: item.usesSelectedEngine ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(item.url),
            queryMode: normalizeQueryMode(item.queryMode),
            builtIn: Boolean(item.builtIn),
            usesSelectedEngine: Boolean(item.usesSelectedEngine),
            iconUrl: item.iconUrl || ""
        })),
        customEngines: state.customEngines.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: ensureQueryPlaceholder(item.url),
            queryMode: normalizeQueryMode(item.queryMode),
            iconUrl: item.iconUrl || ""
        })),
        customSearchUrl: "",
        emptyProfilesByDefault: state.emptyProfilesByDefault,
        collapseDefaultEngines: state.collapseDefaultEngines,
        collapseQuickSearchMenu: state.collapseQuickSearchMenu,
        imdbEnabled: state.imdbEnabled,
        malEnabled: state.malEnabled,
        contextMenuEnabled: state.contextMenuEnabled,
        imdbButtonLabel: state.imdbButtonLabel,
        malButtonLabel: state.malButtonLabel
    };
}

function moveItem(items, index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
    }
    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    return nextItems;
}

function getSearchEngineById(id) {
    return state.searchEngines.find((item) => item.id === id) || state.searchEngines[0];
}

function getActiveProfile() {
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
    if (!iconUrl) {
        return createFallbackIcon(label);
    }

    const img = document.createElement("img");
    img.className = "engine-icon";
    img.src = iconUrl;
    img.alt = `${label} favicon`;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => img.replaceWith(createFallbackIcon(label));
    return img;
}

document.addEventListener("DOMContentLoaded", async () => {
    const suffixInput = document.getElementById("suffix");
    const engineSelect = document.getElementById("searchEngine");
    const searchQueryModeSelect = document.getElementById("searchQueryMode");
    const searchPreview = document.getElementById("searchPreview");
    const searchYandexWarning = document.getElementById("searchYandexWarning");
    const saveBtn = document.getElementById("saveBtn");
    const resetBtn = document.getElementById("resetBtn");
    const exportTriggerBtn = document.getElementById("exportTriggerBtn");
    const exportDropdown = document.getElementById("exportDropdown");
    const importFileInput = document.getElementById("importFileInput");
    const status = document.getElementById("status");

    const defaultEngineNameInput = document.getElementById("defaultEngineName");
    const defaultEngineUrlInput = document.getElementById("defaultEngineUrl");
    const addDefaultEngineBtn = document.getElementById("addDefaultEngineBtn");
    const defaultBuilderPreview = document.getElementById("defaultBuilderPreview");
    const defaultBuilderWarning = document.getElementById("defaultBuilderWarning");
    const defaultEnginesList = document.getElementById("defaultEnginesList");

    const pickFromMenuBtn = document.getElementById("pickFromMenuBtn");
    const menuPickerModal = document.getElementById("menuPickerModal");
    const pickerList = document.getElementById("pickerList");
    const pickerCloseBtn = document.getElementById("pickerCloseBtn");

    const menuItemsList = document.getElementById("menuItemsList");

    const customEngineNameInput = document.getElementById("customEngineName");
    const customEngineUrlInput = document.getElementById("customEngineUrl");
    const customEngineQueryModeSelect = document.getElementById("customEngineQueryMode");
    const addCustomEngineBtn = document.getElementById("addCustomEngineBtn");
    const customBuilderPreview = document.getElementById("customBuilderPreview");
    const customBuilderWarning = document.getElementById("customBuilderWarning");
    const scrollToAddBtn = document.getElementById("scrollToAddBtn");
    const defaultEnginesSection = document.getElementById("defaultEnginesSection");
    const defaultEnginesHeader = document.getElementById("defaultEnginesHeader");
    const defaultEnginesBody = document.getElementById("defaultEnginesBody");
    const menuItemsSection = document.getElementById("menuItemsSection");
    const menuItemsHeader = document.getElementById("menuItemsHeader");
    const menuItemsBody = document.getElementById("menuItemsBody");

    const profileSelect = document.getElementById("profileSelect");
    const addProfileBtn = document.getElementById("addProfileBtn");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const deleteProfileBtn = document.getElementById("deleteProfileBtn");
    const profileSectionIndicator = document.getElementById("profileSectionIndicator");
    const menuProfileIndicator = document.getElementById("menuProfileIndicator");
    const profileSiteSelect = document.getElementById("profileSiteSelect");

    function animateToggle(section, body) {
        if (section.classList.contains("collapsed")) {
            body.style.maxHeight = body.scrollHeight + "px";
            section.classList.remove("collapsed");
            const onEnd = () => {
                body.style.maxHeight = "";
                body.removeEventListener("transitionend", onEnd);
            };
            body.addEventListener("transitionend", onEnd, { once: true });
        } else {
            body.style.maxHeight = body.scrollHeight + "px";
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    section.classList.add("collapsed");
                    body.style.maxHeight = "0";
                });
            });
        }
    }

    defaultEnginesHeader.addEventListener("click", () => animateToggle(defaultEnginesSection, defaultEnginesBody));
    menuItemsHeader.addEventListener("click", () => animateToggle(menuItemsSection, menuItemsBody));

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.className = "status";
        }, 5000);
    }

    function setWarning(container, visible) {
        container.innerHTML = visible ? getYandexWarningHtml() : "";
        container.classList.toggle("show", visible);
    }

    function updateEngineSelect() {
        engineSelect.innerHTML = "";
        state.searchEngines.forEach((engine) => {
            const option = document.createElement("option");
            option.value = engine.id;
            option.textContent = engine.name;
            engineSelect.appendChild(option);
        });

        if (!state.searchEngines.some((engine) => engine.id === state.searchEngineId)) {
            state.searchEngineId = state.searchEngines[0]?.id || DEFAULT_SETTINGS.searchEngineId;
        }

        engineSelect.value = state.searchEngineId;
    }

    function updateSearchPreview() {
        const selectedEngine = getSearchEngineById(state.searchEngineId);
        const previewUrl = selectedEngine
            ? buildSearchUrl(selectedEngine.url, state.searchQueryMode, state.suffix)
            : "";
        searchPreview.textContent = previewUrl ? `Example: ${previewUrl}` : "Example URL will appear here.";
        setWarning(searchYandexWarning, isYandexUrl(selectedEngine?.url || ""));
    }

    function updateBuilderPreview() {
        defaultBuilderPreview.textContent = `Example: ${buildSearchUrl(defaultEngineUrlInput.value || "https://example.com/search?q=", "titleYear", "")}`;
        setWarning(defaultBuilderWarning, isYandexUrl(defaultEngineUrlInput.value));

        customBuilderPreview.textContent = `Example: ${buildSearchUrl(customEngineUrlInput.value || "https://example.com/search?q=", customEngineQueryModeSelect.value, "")}`;
        setWarning(customBuilderWarning, isYandexUrl(customEngineUrlInput.value));
    }
    function updateTitleBlock(container, item, subtitleText) {
        const titleText = document.createElement("div");
        titleText.className = "engine-title-text";

        const name = document.createElement("div");
        name.className = "engine-title-name";
        name.textContent = item.name || "Unnamed item";

        const subtitle = document.createElement("div");
        subtitle.className = "engine-title-url";
        subtitle.textContent = subtitleText;

        titleText.appendChild(name);
        titleText.appendChild(subtitle);
        container.appendChild(titleText);
    }

    function createQueryModeSelect(value, allowConfigured = false) {
        const select = document.createElement("select");
        select.innerHTML = `${allowConfigured ? '<option value="configured">configured default</option>' : ''}<option value="title">title</option><option value="titleYear">title+year</option>`;
        select.value = normalizeQueryMode(value, allowConfigured ? "configured" : "titleYear");
        return select;
    }

    function createCardActions(collectionName, index, item, allowDelete = true) {
        const list = state[collectionName];
        const actions = document.createElement("div");
        actions.className = "engine-actions";

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "mini-btn";
        upBtn.textContent = "Up";
        upBtn.disabled = index === 0;
        upBtn.onclick = () => {
            state[collectionName] = moveItem(list, index, -1);
            render();
        };

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "mini-btn";
        downBtn.textContent = "Down";
        downBtn.disabled = index === list.length - 1;
        downBtn.onclick = () => {
            state[collectionName] = moveItem(list, index, 1);
            render();
        };

        actions.appendChild(upBtn);
        actions.appendChild(downBtn);

        if (allowDelete) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "mini-btn mini-btn-danger";
            deleteBtn.textContent = "Delete";
            deleteBtn.onclick = () => {
                if (collectionName === "searchEngines" && state.searchEngines.length === 1) {
                    showStatus("At least one default search engine must remain", "error");
                    return;
                }
                state[collectionName] = state[collectionName].filter((entry) => entry.id !== item.id);
                if (collectionName === "searchEngines" && state.searchEngineId === item.id) {
                    state.searchEngineId = state.searchEngines.find((entry) => entry.id !== item.id)?.id || state.searchEngineId;
                }
                render();
            };
            actions.appendChild(deleteBtn);
        }

        return actions;
    }

    function createSearchEngineCard(engine, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        title.appendChild(createFaviconElement(engine.url, engine.name));
        updateTitleBlock(title, engine, engine.url);
        if (engine.builtIn) {
            const badge = document.createElement("span");
            badge.className = "engine-badge";
            badge.textContent = "Built-in";
            title.appendChild(badge);
        }
        header.appendChild(title);
        header.appendChild(createCardActions("searchEngines", index, engine, true));

        const fields = document.createElement("div");
        fields.className = "engine-fields";
        const nameWrap = document.createElement("div");
        nameWrap.innerHTML = `<label>Name</label>`;
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = engine.name;
        nameInput.addEventListener("input", () => { engine.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = engine.url;
        urlInput.addEventListener("input", () => { engine.url = urlInput.value; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(urlWrap);

        const warning = document.createElement("div");
        warning.className = `warning-box${isYandexUrl(engine.url) ? " show" : ""}`;
        if (isYandexUrl(engine.url)) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(warning);
        return card;
    }

    function createClickableIcon(item) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Click to change icon";
        btn.style.cssText = "background:none;border:none;cursor:pointer;padding:0;border-radius:6px;display:flex;transition:opacity 0.15s;flex-shrink:0;";
        btn.onmouseenter = () => { btn.style.opacity = "0.7"; };
        btn.onmouseleave = () => { btn.style.opacity = "1"; };
        if (item.iconUrl) {
            const img = document.createElement("img");
            img.className = "engine-icon";
            img.src = item.iconUrl;
            img.alt = `${item.name} icon`;
            img.referrerPolicy = "no-referrer";
            img.onerror = function () { this.replaceWith(createFallbackIcon(item.name)); };
            btn.appendChild(img);
        } else {
            const url = item.usesSelectedEngine
                ? (getSearchEngineById(state.searchEngineId)?.url || item.url)
                : item.url;
            btn.appendChild(createFaviconElement(url, item.name));
        }
        btn.onclick = (e) => { e.stopPropagation(); openIconPicker(item); };
        return btn;
    }

    function createMenuItemCard(item, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        title.appendChild(createClickableIcon(item));
        updateTitleBlock(title, item, item.usesSelectedEngine ? "Uses selected default search engine" : item.url);
        if (item.builtIn) {
            const badge = document.createElement("span");
            badge.className = "engine-badge";
            badge.textContent = "Built-in";
            title.appendChild(badge);
        }
        header.appendChild(title);
        header.appendChild(createCardActions("menuItems", index, item, true));

        const fields = document.createElement("div");
        fields.className = "engine-fields";
        const nameWrap = document.createElement("div");
        nameWrap.innerHTML = `<label>Name</label>`;
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = item.name;
        nameInput.addEventListener("input", () => { item.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);

        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, item.usesSelectedEngine);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; isDirty = true; updateSaveButtonState(); });
        queryWrap.appendChild(querySelect);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.usesSelectedEngine
            ? (getSearchEngineById(state.searchEngineId)?.url || "")
            : item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; item.usesSelectedEngine = false; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = item.usesSelectedEngine
            ? "Currently follows the selected Default Search Engine. Editing this field will detach it and use your custom URL."
            : "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(queryWrap);
        fields.appendChild(urlWrap);

        const warning = document.createElement("div");
        const shouldWarn = !item.usesSelectedEngine && isYandexUrl(item.url);
        warning.className = `warning-box${shouldWarn ? " show" : ""}`;
        if (shouldWarn) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(warning);
        return card;
    }
    function createCustomEngineCard(item, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        title.appendChild(createClickableIcon(item));
        updateTitleBlock(title, item, item.url);
        header.appendChild(title);
        header.appendChild(createCardActions("customEngines", index, item, true));

        const fields = document.createElement("div");
        fields.className = "engine-fields";
        const nameWrap = document.createElement("div");
        nameWrap.innerHTML = `<label>Name</label>`;
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = item.name;
        nameInput.addEventListener("input", () => { item.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);

        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, false);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; isDirty = true; updateSaveButtonState(); });
        queryWrap.appendChild(querySelect);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(queryWrap);
        fields.appendChild(urlWrap);

        const warning = document.createElement("div");
        warning.className = `warning-box${isYandexUrl(item.url) ? " show" : ""}`;
        if (isYandexUrl(item.url)) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(warning);
        return card;
    }

    function renderDefaultEngines() {
        defaultEnginesList.innerHTML = "";
        if (state.searchEngines.length === 0) {
            defaultEnginesList.innerHTML = `<div class="empty-state">No default search engines yet.</div>`;
            return;
        }
        state.searchEngines.forEach((item, index) => defaultEnginesList.appendChild(createSearchEngineCard(item, index)));
    }

    function renderMenuItems() {
        menuItemsList.innerHTML = "";
        const allItems = [...state.menuItems, ...state.customEngines];
        if (allItems.length === 0) {
            menuItemsList.innerHTML = `<div class="empty-state">No quick search menu items yet.</div>`;
            return;
        }
        state.menuItems.forEach((item, index) => menuItemsList.appendChild(createMenuItemCard(item, index)));
        if (state.customEngines.length > 0) {
            state.customEngines.forEach((item, index) => menuItemsList.appendChild(createCustomEngineCard(item, index)));
        }
    }

    function updateSaveButtonState() {
        saveBtn.classList.toggle('btn-unsaved', isDirty);
    }

    function renderProfileSelect() {
        const currentId = state.activeProfileId;
        profileSelect.innerHTML = "";
        const ids = Object.keys(state.profiles);
        if (ids.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No profiles";
            profileSelect.appendChild(opt);
            return;
        }
        ids.forEach((id) => {
            const p = state.profiles[id];
            if (!p) return;
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = p.name || id;
            if (id === currentId) opt.selected = true;
            profileSelect.appendChild(opt);
        });
        const profile = getActiveProfile();
        const profileName = profile ? profile.name : "";
        profileSectionIndicator.textContent = `(Profile: ${profileName})`;
        menuProfileIndicator.textContent = `(Profile: ${profileName})`;
    }

    function findProfileBySite(site) {
        if (!site || site === "\u2014") return null;
        const ids = Object.keys(state.profiles);
        for (const id of ids) {
            const p = state.profiles[id];
            if (p && p.site === site && id !== state.activeProfileId) return p;
        }
        return null;
    }

    function renderSiteSelect() {
        const profile = getActiveProfile();
        profileSiteSelect.innerHTML = "";
        SITE_OPTIONS.forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            if (profile && profile.site === opt.value) option.selected = true;
            profileSiteSelect.appendChild(option);
        });
    }

    function render() {
        updateEngineSelect();
        searchQueryModeSelect.value = state.searchQueryMode;
        suffixInput.value = state.suffix;
        renderDefaultEngines();
        renderMenuItems();
        updateSearchPreview();
        updateBuilderPreview();
        updateSaveButtonState();
        renderProfileSelect();
        renderSiteSelect();
        const toggle1 = document.getElementById("emptyProfilesToggle");
        if (toggle1) toggle1.checked = state.emptyProfilesByDefault;
        const toggle2 = document.getElementById("collapseDefaultToggle");
        if (toggle2) toggle2.checked = state.collapseDefaultEngines;
        const toggle3 = document.getElementById("collapseQuickToggle");
        if (toggle3) toggle3.checked = state.collapseQuickSearchMenu;
        defaultEnginesSection.classList.toggle("collapsed", state.collapseDefaultEngines);
        menuItemsSection.classList.toggle("collapsed", state.collapseQuickSearchMenu);
        const cb = (id) => document.getElementById(id);
        const setChecked = (id, val) => { const e = cb(id); if (e) e.checked = val; };
        const setVal = (id, val) => { const e = cb(id); if (e) e.value = val; };
        setChecked("imdbEnabledToggle", state.imdbEnabled);
        setChecked("malEnabledToggle", state.malEnabled);
        setChecked("contextMenuToggle", state.contextMenuEnabled);
        setVal("imdbButtonLabelSelect", state.imdbButtonLabel);
        setVal("malButtonLabelSelect", state.malButtonLabel);
    }

    try {
        state = normalizeSettings(await browser.storage.local.get(null));
        render();
        isDirty = false;
        updateSaveButtonState();
    } catch (error) {
        console.error("Error loading settings:", error);
        showStatus("Error loading settings", "error");
        render();
        isDirty = false;
        updateSaveButtonState();
    }

    engineSelect.addEventListener("change", () => {
        state.searchEngineId = engineSelect.value;
        isDirty = true;
        updateSaveButtonState();
        render();
    });

    searchQueryModeSelect.addEventListener("change", () => {
        state.searchQueryMode = searchQueryModeSelect.value;
        isDirty = true;
        updateSaveButtonState();
        updateSearchPreview();
    });

    suffixInput.addEventListener("input", () => {
        state.suffix = suffixInput.value;
        isDirty = true;
        updateSaveButtonState();
        updateSearchPreview();
    });

    profileSelect.addEventListener("change", () => {
        const newId = profileSelect.value;
        if (!newId || newId === state.activeProfileId) return;
        const oldProfile = getActiveProfile();
        if (oldProfile) {
            oldProfile.suffix = state.suffix;
            oldProfile.searchQueryMode = state.searchQueryMode;
            oldProfile.menuItems = state.menuItems;
            oldProfile.customEngines = state.customEngines;
        }
        state.activeProfileId = newId;
        const newProfile = getActiveProfile();
        if (newProfile) {
            state.suffix = newProfile.suffix;
            state.searchQueryMode = newProfile.searchQueryMode;
            state.menuItems = newProfile.menuItems;
            state.customEngines = newProfile.customEngines;
        }
        render();
    });

    addProfileBtn.addEventListener("click", () => {
        const name = prompt("Enter a name for the new profile:");
        if (!name || !name.trim()) return;
        const id = "profile_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const newProfile = {
            id,
            name: name.trim(),
            site: "\u2014",
            suffix: DEFAULT_SETTINGS.suffix,
            searchQueryMode: DEFAULT_SETTINGS.searchQueryMode,
            menuItems: state.emptyProfilesByDefault ? [] : DEFAULT_MENU_ITEMS.map(i => ({ ...i })),
            customEngines: []
        };
        state.profiles[id] = newProfile;
        state.activeProfileId = id;
        loadProfileIntoState(newProfile);
        render();
        showStatus("Profile created", "success");
    });

    deleteProfileBtn.addEventListener("click", () => {
        const ids = Object.keys(state.profiles);
        if (ids.length <= 1) {
            showStatus("Cannot delete the last profile", "error");
            return;
        }
        const profile = getActiveProfile();
        if (!profile) return;
        if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) return;
        delete state.profiles[state.activeProfileId];
        const remainingIds = Object.keys(state.profiles);
        state.activeProfileId = remainingIds[0];
        loadProfileIntoState(state.profiles[remainingIds[0]]);
        render();
        showStatus("Profile deleted", "success");
    });

    editProfileBtn.addEventListener("click", () => {
        const profile = getActiveProfile();
        if (!profile) return;
        const newName = prompt("Edit profile name:", profile.name);
        if (newName && newName.trim()) {
            profile.name = newName.trim();
            render();
            showStatus("Profile renamed", "success");
        }
    });

    profileSiteSelect.addEventListener("change", () => {
        const newSite = profileSiteSelect.value;
        if (!newSite) return;
        const profile = getActiveProfile();
        if (!profile) return;

        const conflicting = findProfileBySite(newSite);
        if (conflicting) {
            if (!confirm(`Site "${newSite}" is already assigned to profile "${conflicting.name}". Remove it from "${conflicting.name}" and assign to "${profile.name}"?`)) {
                renderSiteSelect();
                return;
            }
            conflicting.site = "\u2014";
        }

        profile.site = newSite;
        isDirty = true;
        updateSaveButtonState();
    });

    defaultEngineUrlInput.addEventListener("input", updateBuilderPreview);
    customEngineUrlInput.addEventListener("input", updateBuilderPreview);
    customEngineQueryModeSelect.addEventListener("change", updateBuilderPreview);

    addDefaultEngineBtn.addEventListener("click", () => {
        const name = defaultEngineNameInput.value.trim();
        const url = defaultEngineUrlInput.value.trim();
        if (!name || !url) {
            showStatus("Please enter both name and URL", "error");
            return;
        }
        if (!isValidHttpUrl(url)) {
            showStatus("URL must start with http:// or https://", "error");
            return;
        }
        state.searchEngines.push({ id: makeId("engine"), name, url: ensureQueryPlaceholder(url), builtIn: false });
        defaultEngineNameInput.value = "";
        defaultEngineUrlInput.value = "";
        isDirty = true;
        render();
        updateSaveButtonState();
        showStatus("Default search engine added to the draft list", "success");
    });

    addCustomEngineBtn.addEventListener("click", () => {
        const name = customEngineNameInput.value.trim();
        const url = customEngineUrlInput.value.trim();
        const queryMode = customEngineQueryModeSelect.value;
        if (!name || !url) {
            showStatus("Please enter both name and URL", "error");
            return;
        }
        if (!isValidHttpUrl(url)) {
            showStatus("URL must start with http:// or https://", "error");
            return;
        }
        state.customEngines.push({ id: makeId("custom"), name, url: ensureQueryPlaceholder(url), queryMode: normalizeQueryMode(queryMode) });
        customEngineNameInput.value = "";
        customEngineUrlInput.value = "";
        customEngineQueryModeSelect.value = "titleYear";
        isDirty = true;
        render();
        updateSaveButtonState();
        showStatus("Search engine added to the draft list", "success");
    });

    scrollToAddBtn.addEventListener("click", () => {
        document.getElementById("addForm").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function populatePicker() {
        pickerList.innerHTML = "";
        const allItems = [...state.menuItems, ...state.customEngines];
        if (allItems.length === 0) {
            pickerList.innerHTML = '<div class="empty-state">No menu items yet.</div>';
            return;
        }
        allItems.forEach((item) => {
            const el = document.createElement("div");
            el.className = "picker-item";
            const url = item.usesSelectedEngine
                ? (getSearchEngineById(state.searchEngineId)?.url || item.url)
                : item.url;
            el.appendChild(createFaviconElement(url, item.name));
            const textWrap = document.createElement("div");
            textWrap.style.minWidth = "0";
            textWrap.innerHTML = `<div class="picker-item-name">${item.name}</div><div class="picker-item-url">${url}</div>`;
            el.appendChild(textWrap);
            el.addEventListener("click", () => {
                defaultEngineNameInput.value = item.name;
                defaultEngineUrlInput.value = url;
                updateBuilderPreview();
                menuPickerModal.classList.remove("show");
            });
            pickerList.appendChild(el);
        });
    }

    pickFromMenuBtn.addEventListener("click", () => {
        populatePicker();
        menuPickerModal.classList.add("show");
    });

    pickerCloseBtn.addEventListener("click", () => {
        menuPickerModal.classList.remove("show");
    });

    menuPickerModal.addEventListener("click", (e) => {
        if (e.target === menuPickerModal) {
            menuPickerModal.classList.remove("show");
        }
    });

    let iconPickerTarget = null;
    const iconPickerModal = document.getElementById("iconPickerModal");
    const iconPickerCloseBtn = document.getElementById("iconPickerCloseBtn");
    const iconUrlInput = document.getElementById("iconUrlInput");
    const iconFileInput = document.getElementById("iconFileInput");
    const iconPreviewImg = document.getElementById("iconPreviewImg");
    const suggestedIcons = document.getElementById("suggestedIcons");
    const noSuggestions = document.getElementById("noSuggestions");
    const iconPickerApplyBtn = document.getElementById("iconPickerApplyBtn");
    const iconPickerRemoveBtn = document.getElementById("iconPickerRemoveBtn");

    function getItemDisplayUrl(item) {
        return item.usesSelectedEngine
            ? (getSearchEngineById(state.searchEngineId)?.url || item.url)
            : item.url;
    }

    function buildSuggestedIcons(item) {
        suggestedIcons.innerHTML = "";
        noSuggestions.style.display = "none";
        const url = getItemDisplayUrl(item);
        if (!url || url === "__DEFAULT_ENGINE__") {
            noSuggestions.style.display = "block";
            noSuggestions.textContent = "No URL defined yet";
            return;
        }
        const domains = extractDomainsFromUrl(url);
        if (domains.length === 0) {
            noSuggestions.style.display = "block";
            return;
        }
        domains.forEach((domain) => {
            const faviconUrl = `https://${domain}/favicon.ico`;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.title = domain;
            btn.style.cssText = "width:44px;height:44px;border-radius:10px;border:2px solid transparent;background:#2a2a2a;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:border-color 0.15s;overflow:hidden;";
            btn.onmouseenter = () => { btn.style.borderColor = "#666"; };
            btn.onmouseleave = () => { btn.style.borderColor = "transparent"; };
            const img = document.createElement("img");
            img.src = faviconUrl;
            img.alt = domain;
            img.style.cssText = "width:28px;height:28px;object-fit:contain;";
            img.onerror = () => {
                img.style.display = "none";
                const fallback = document.createElement("div");
                fallback.style.cssText = "width:28px;height:28px;border-radius:6px;background:#3a3a3a;color:#ddd;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;text-transform:uppercase;";
                fallback.textContent = domain.charAt(0).toUpperCase();
                btn.appendChild(fallback);
            };
            btn.appendChild(img);
            btn.onclick = () => {
                setIconPreview(faviconUrl);
                iconUrlInput.value = faviconUrl;
            };
            suggestedIcons.appendChild(btn);
        });
    }

    function setIconPreview(url) {
        iconPreviewImg.src = url;
        iconPreviewImg.style.display = url ? "" : "none";
        iconPreviewImg.onerror = () => { iconPreviewImg.style.display = "none"; };
    }

    function openIconPicker(item) {
        iconPickerTarget = item;
        iconUrlInput.value = item.iconUrl || "";
        iconFileInput.value = "";
        setIconPreview(item.iconUrl || "");
        buildSuggestedIcons(item);
        iconPickerModal.classList.add("show");
    }

    iconPickerCloseBtn.addEventListener("click", () => {
        iconPickerModal.classList.remove("show");
        iconPickerTarget = null;
    });

    iconPickerModal.addEventListener("click", (e) => {
        if (e.target === iconPickerModal) {
            iconPickerModal.classList.remove("show");
            iconPickerTarget = null;
        }
    });

    iconUrlInput.addEventListener("input", () => {
        const val = iconUrlInput.value.trim();
        if (val) {
            setIconPreview(val);
        } else {
            setIconPreview("");
        }
    });

    iconFileInput.addEventListener("change", () => {
        const file = iconFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            iconUrlInput.value = dataUrl;
            setIconPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    });

    iconPickerApplyBtn.addEventListener("click", () => {
        if (!iconPickerTarget) return;
        iconPickerTarget.iconUrl = iconUrlInput.value.trim();
        iconPickerModal.classList.remove("show");
        iconPickerTarget = null;
        render();
        showStatus("Icon updated", "success");
    });

    iconPickerRemoveBtn.addEventListener("click", () => {
        if (!iconPickerTarget) return;
        iconPickerTarget.iconUrl = "";
        iconPickerModal.classList.remove("show");
        iconPickerTarget = null;
        render();
        showStatus("Icon removed", "success");
    });

    saveBtn.addEventListener("click", async () => {
        state.suffix = suffixInput.value.trim();
        state.searchEngineId = engineSelect.value;
        state.searchQueryMode = searchQueryModeSelect.value;

        const profile = getActiveProfile();
        if (profile) {
            profile.suffix = state.suffix;
            profile.searchQueryMode = state.searchQueryMode;
            profile.menuItems = state.menuItems;
            profile.customEngines = state.customEngines;
        }

        const invalidDefault = state.searchEngines.find((item) => !item.name.trim() || !isValidHttpUrl(item.url));
        const invalidMenuItem = state.menuItems.find((item) => {
            if (!item.name.trim()) {
                return true;
            }
            if (item.usesSelectedEngine) {
                return false;
            }
            return !isValidHttpUrl(item.url);
        });
        const invalidCustom = state.customEngines.find((item) => !item.name.trim() || !isValidHttpUrl(item.url));

        if (invalidDefault || invalidMenuItem || invalidCustom) {
            showStatus("Every item needs a name and a valid URL", "error");
            return;
        }
        if (state.searchEngines.length === 0) {
            showStatus("At least one default search engine must remain", "error");
            return;
        }

        try {
            await browser.storage.local.set(serializeSettings());
            showStatus("Settings saved successfully!", "success");
            render();
            isDirty = false;
            updateSaveButtonState();
        } catch (error) {
            console.error("Error saving settings:", error);
            showStatus("Error saving settings", "error");
        }
    });

    resetBtn.addEventListener("click", async () => {
        if (!confirm("Reset all settings to default values?")) {
            return;
        }

        try {
            state = createDefaultState();
            await browser.storage.local.set(serializeSettings());
            defaultEngineNameInput.value = "";
            defaultEngineUrlInput.value = "";
            customEngineNameInput.value = "";
            customEngineUrlInput.value = "";
            customEngineQueryModeSelect.value = "titleYear";
            render();
            isDirty = false;
            updateSaveButtonState();
            showStatus("Settings reset to defaults", "success");
        } catch (error) {
            console.error("Error resetting settings:", error);
            showStatus("Error resetting settings", "error");
        }
    });

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportSettings() {
        const profile = getActiveProfile();
        if (profile) {
            saveCurrentProfileToState();
        }
        const data = serializeSettings();
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadJson(data, `rere-settings-${timestamp}.json`);
        showStatus("Settings exported", "success");
        closeExportDropdown();
    }

    function exportProfile() {
        const profile = getActiveProfile();
        if (!profile) return;
        saveCurrentProfileToState();
        const timestamp = new Date().toISOString().slice(0, 10);
        const safeName = profile.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadJson({ ...profile }, `rere-profile-${safeName}-${timestamp}.json`);
        showStatus(`Profile "${profile.name}" exported`, "success");
        closeExportDropdown();
    }

    function isProfileDuplicate(profile) {
        const normalized = {
            site: SITE_OPTIONS.some(s => s.value === profile.site) ? profile.site : "\u2014",
            suffix: typeof profile.suffix === "string" ? profile.suffix : state.suffix,
            searchQueryMode: normalizeQueryMode(profile.searchQueryMode, state.searchQueryMode),
            menuItems: Array.isArray(profile.menuItems)
                ? profile.menuItems.map(m => normalizeMenuItem(m, DEFAULT_MENU_ITEMS[0]))
                : null,
            customEngines: Array.isArray(profile.customEngines)
                ? profile.customEngines.map(normalizeCustomEngine)
                : []
        };
        const needle = JSON.stringify(normalized);
        return Object.values(state.profiles).some(p => {
            const existing = {
                site: p.site,
                suffix: p.suffix,
                searchQueryMode: p.searchQueryMode,
                menuItems: p.menuItems,
                customEngines: p.customEngines
            };
            return JSON.stringify(existing) === needle;
        });
    }

    function addImportedProfile(profile) {
        if (isProfileDuplicate(profile)) return null;

        let newName = profile.name || "Imported";
        const existingNames = Object.values(state.profiles).map(p => p.name);
        if (existingNames.includes(newName)) {
            let counter = 2;
            while (existingNames.includes(newName + " (" + counter + ")")) {
                counter++;
            }
            newName = newName + " (" + counter + ")";
        }
        const newId = makeId("imported");
        state.profiles[newId] = {
            id: newId,
            name: newName,
            site: SITE_OPTIONS.some(s => s.value === profile.site) ? profile.site : "\u2014",
            suffix: typeof profile.suffix === "string" ? profile.suffix : state.suffix,
            searchQueryMode: normalizeQueryMode(profile.searchQueryMode, state.searchQueryMode),
            menuItems: Array.isArray(profile.menuItems)
                ? profile.menuItems.map(m => normalizeMenuItem(m, DEFAULT_MENU_ITEMS[0]))
                : state.menuItems.map(i => ({ ...i })),
            customEngines: Array.isArray(profile.customEngines)
                ? profile.customEngines.map(normalizeCustomEngine)
                : []
        };
        return newId;
    }

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                saveCurrentProfileToState();
                let firstNewId = null;

                // Merge search engines (add unique ones)
                if (Array.isArray(data.searchEngines)) {
                    for (const engine of data.searchEngines) {
                        if (!state.searchEngines.some(e => e.id === engine.id)) {
                            state.searchEngines.push(normalizeSearchEngine(engine, engine));
                        }
                    }
                }

                // Merge profiles (add as new, rename on clash)
                if (data.profiles && typeof data.profiles === "object") {
                    for (const [, profile] of Object.entries(data.profiles)) {
                        const newId = addImportedProfile(profile);
                        if (!firstNewId) firstNewId = newId;
                    }
                }

                // Handle flat single-profile import
                if (data.name && !data.profiles) {
                    const newId = addImportedProfile(data);
                    if (!firstNewId) firstNewId = newId;
                }

                if (firstNewId) {
                    state.activeProfileId = firstNewId;
                    loadProfileIntoState(state.profiles[firstNewId]);
                }

                await browser.storage.local.set(serializeSettings());
                render();
                isDirty = false;
                updateSaveButtonState();
                showStatus("Settings imported successfully!", "success");
            } catch (err) {
                console.error("Import error:", err);
                showStatus("Failed to import settings: invalid file", "error");
            }
        };
        reader.readAsText(file);
        closeExportDropdown();
    }

    function encodeSettings(obj) {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return "rere:import:" + btoa(binary);
    }

    function decodeSettings(str) {
        const prefix = "rere:import:";
        let encoded = str;
        if (encoded.startsWith(prefix)) {
            encoded = encoded.slice(prefix.length);
        }
        encoded = encoded.trim();
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    function importData(data) {
        saveCurrentProfileToState();
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

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const { firstNewId, added, skipped } = importData(data);
                if (firstNewId) {
                    state.activeProfileId = firstNewId;
                    loadProfileIntoState(state.profiles[firstNewId]);
                }
                await browser.storage.local.set(serializeSettings());
                render();
                isDirty = false;
                updateSaveButtonState();
                const parts = [];
                if (added > 0) parts.push(added + " profile(s) added");
                if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                showStatus("Settings imported: " + (parts.join(", ") || "no changes"), "success");
            } catch (err) {
                console.error("Import error:", err);
                showStatus("Failed to import settings: invalid file", "error");
            }
        };
        reader.readAsText(file);
        closeExportDropdown();
    }

    function importFromStr(str) {
        try {
            const data = decodeSettings(str);
            const { firstNewId, added, skipped } = importData(data);
            if (firstNewId) {
                state.activeProfileId = firstNewId;
                loadProfileIntoState(state.profiles[firstNewId]);
            }
            browser.storage.local.set(serializeSettings()).then(() => {
                render();
                isDirty = false;
                updateSaveButtonState();
                const parts = [];
                if (added > 0) parts.push(added + " profile(s) added");
                if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                showStatus("Imported from link: " + (parts.join(", ") || "no changes"), "success");
            });
        } catch (err) {
            console.error("Import from link error:", err);
            showStatus("Failed to parse import link", "error");
        }
    }

    function closeExportDropdown() {
        exportDropdown.classList.remove("show");
        exportTriggerBtn.classList.remove("active");
    }

    exportTriggerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle("show");
        exportTriggerBtn.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".save-group")) {
            closeExportDropdown();
        }
    });

    exportDropdown.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === "export") exportSettings();
        else if (action === "import") importFileInput.click();
        else if (action === "export-profile") exportProfile();
        else if (action === "copy-link") {
            const profile = getActiveProfile();
            if (profile) saveCurrentProfileToState();
            const data = serializeSettings();
            const link = encodeSettings(data);
            navigator.clipboard.writeText(link).then(() => {
                showStatus("Import link copied to clipboard", "success");
            }).catch(() => {
                showStatus("Failed to copy to clipboard", "error");
            });
            closeExportDropdown();
        } else if (action === "paste-import") {
            openPasteModal();
        } else if (action === "paste-clipboard") {
            navigator.clipboard.readText().then(text => {
                const val = text.trim();
                if (!val) {
                    showStatus("Clipboard is empty", "error");
                    return;
                }
                importFromStr(val);
            }).catch(() => {
                showStatus("Cannot read clipboard. Grant permission or paste via Ctrl+V.", "error");
            });
            closeExportDropdown();
        } else if (action === "copy-profile") {
            saveCurrentProfileToState();
            const profile = getActiveProfile();
            if (profile) {
                const link = encodeSettings(profile);
                navigator.clipboard.writeText(link).then(() => {
                    showStatus('Profile "' + profile.name + '" link copied', "success");
                }).catch(() => {
                    showStatus("Failed to copy to clipboard", "error");
                });
            }
            closeExportDropdown();
        }
    });

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) importSettings(file);
        importFileInput.value = "";
    });

    const emptyToggle = document.getElementById("emptyProfilesToggle");
    if (emptyToggle) {
        emptyToggle.addEventListener("change", () => {
            state.emptyProfilesByDefault = emptyToggle.checked;
            isDirty = true;
            updateSaveButtonState();
        });
    }

    const collapseDefaultToggle = document.getElementById("collapseDefaultToggle");
    if (collapseDefaultToggle) {
        collapseDefaultToggle.addEventListener("change", () => {
            state.collapseDefaultEngines = collapseDefaultToggle.checked;
            defaultEnginesSection.classList.toggle("collapsed", state.collapseDefaultEngines);
            isDirty = true;
            updateSaveButtonState();
        });
    }

    const collapseQuickToggle = document.getElementById("collapseQuickToggle");
    if (collapseQuickToggle) {
        collapseQuickToggle.addEventListener("change", () => {
            state.collapseQuickSearchMenu = collapseQuickToggle.checked;
            menuItemsSection.classList.toggle("collapsed", state.collapseQuickSearchMenu);
            isDirty = true;
            updateSaveButtonState();
        });
    }

    function bindToggle(id, key) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", () => { state[key] = el.checked; isDirty = true; updateSaveButtonState(); });
    }
    function bindSelect(id, key) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", () => { state[key] = el.value; isDirty = true; updateSaveButtonState(); });
    }
    bindToggle("imdbEnabledToggle", "imdbEnabled");
    bindToggle("malEnabledToggle", "malEnabled");
    bindToggle("contextMenuToggle", "contextMenuEnabled");
    bindSelect("imdbButtonLabelSelect", "imdbButtonLabel");
    bindSelect("malButtonLabelSelect", "malButtonLabel");

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const panel = document.getElementById("tab" + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1));
            if (panel) panel.classList.add("active");
        });
    });

    // Handle hash auto-import on page load
    if (window.location.hash.startsWith("#import=")) {
        const encoded = window.location.hash.slice("#import=".length);
        try {
            const data = decodeSettings(encoded);
            browser.storage.local.get(null).then((saved) => {
                Object.assign(state, normalizeSettings(saved));
                    const { firstNewId, added, skipped } = importData(data);
                    if (firstNewId) {
                        state.activeProfileId = firstNewId;
                        loadProfileIntoState(state.profiles[firstNewId]);
                    }
                    browser.storage.local.set(serializeSettings()).then(() => {
                        render();
                        isDirty = false;
                        updateSaveButtonState();
                        const parts = [];
                        if (added > 0) parts.push(added + " profile(s) added");
                        if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                        showStatus("Auto-imported: " + (parts.join(", ") || "no changes"), "success");
                    history.replaceState(null, "", window.location.pathname);
                });
            });
        } catch (err) {
            console.error("Hash auto-import error:", err);
            showStatus("Failed to auto-import from URL", "error");
        }
    }

});
