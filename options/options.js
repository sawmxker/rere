
const DEFAULT_SEARCH_ENGINES = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q={query}", builtIn: true },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}", builtIn: true },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q={query}", builtIn: true }
];

const DEFAULT_MENU_ITEMS = [
    { id: "menu_info", name: "Search in new tab (info)", url: "__DEFAULT_ENGINE__", queryMode: "configured", builtIn: true, usesSelectedEngine: true },
    { id: "menu_title", name: "Search in new tab (by title)", url: "__DEFAULT_ENGINE__", queryMode: "title", builtIn: true, usesSelectedEngine: true },
    { id: "menu_youtube", name: "Search YouTube", url: "https://www.youtube.com/results?search_query={query}", queryMode: "title", builtIn: true },
    { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true },
    { id: 'menu_mal_visit', name: 'Visit MyAnimeList page', url: 'https://www.google.com/search?q=site:myanimelist.net+{query}&btnI', queryMode: 'titleYear', builtIn: true },
    { id: "menu_archive", name: "Search Archive.org", url: "https://archive.org/search?query={query}", queryMode: "title", builtIn: true },
    { id: "menu_animetosho", name: "Search Animetosho", url: "https://animetosho.org/search?q={query}", queryMode: "title", builtIn: true },
    { id: "menu_rutracker", name: "Search RuTracker", url: "https://rutracker.org/forum/tracker.php?nm={query}", queryMode: "titleYear", builtIn: true }
];

const DEFAULT_SETTINGS = {
    suffix: "watch",
    searchEngineId: "google",
    searchQueryMode: "titleYear",
    searchEngines: DEFAULT_SEARCH_ENGINES,
    menuItems: DEFAULT_MENU_ITEMS,
    customEngines: []
};

const YANDEX_DOMAINS = [
    "yandex.com",
    "yandex.ru",
    "yandex.by",
    "yandex.kz",
    "yandex.ua",
    "yandex.com.tr",
    "ya.ru"
];

let state = createDefaultState();

function createDefaultState() {
    return {
        suffix: DEFAULT_SETTINGS.suffix,
        searchEngineId: DEFAULT_SETTINGS.searchEngineId,
        searchQueryMode: DEFAULT_SETTINGS.searchQueryMode,
        searchEngines: DEFAULT_SEARCH_ENGINES.map((item) => ({ ...item })),
        menuItems: DEFAULT_MENU_ITEMS.map((item) => ({ ...item })),
        customEngines: []
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
        usesSelectedEngine: url === "__DEFAULT_ENGINE__" || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine)
    };
}

function normalizeCustomEngine(raw) {
    return {
        id: raw?.id || makeId("custom"),
        name: (raw?.name || "Custom Search").trim(),
        url: ensureQueryPlaceholder(raw?.url || ""),
        queryMode: normalizeQueryMode(raw?.queryMode, "titleYear")
    };
}
function normalizeSettings(raw) {
    const next = createDefaultState();
    const rawSearchEngines = Array.isArray(raw.searchEngines) && raw.searchEngines.length > 0
        ? raw.searchEngines
        : DEFAULT_SEARCH_ENGINES;
    const rawMenuItems = Array.isArray(raw.menuItems) && raw.menuItems.length > 0
        ? raw.menuItems
        : DEFAULT_MENU_ITEMS;
    const rawCustomEngines = Array.isArray(raw.customEngines) ? raw.customEngines : [];

    next.searchEngines = rawSearchEngines.map((item, index) =>
        normalizeSearchEngine(item, DEFAULT_SEARCH_ENGINES[index] || DEFAULT_SEARCH_ENGINES[0])
    );
    next.menuItems = rawMenuItems.map((item, index) =>
        normalizeMenuItem(item, DEFAULT_MENU_ITEMS[index] || DEFAULT_MENU_ITEMS[0])
    );
    next.customEngines = rawCustomEngines.map(normalizeCustomEngine);
    next.suffix = typeof raw.suffix === "string" ? raw.suffix : DEFAULT_SETTINGS.suffix;
    next.searchQueryMode = normalizeQueryMode(raw.searchQueryMode, DEFAULT_SETTINGS.searchQueryMode);

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

    return next;
}

function serializeSettings() {
    return {
        suffix: state.suffix,
        searchEngineId: state.searchEngineId,
        searchEngine: state.searchEngineId,
        searchQueryMode: state.searchQueryMode,
        searchEngines: state.searchEngines.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: ensureQueryPlaceholder(item.url),
            builtIn: Boolean(item.builtIn)
        })),
        menuItems: state.menuItems.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: item.usesSelectedEngine ? "__DEFAULT_ENGINE__" : ensureQueryPlaceholder(item.url),
            queryMode: normalizeQueryMode(item.queryMode),
            builtIn: Boolean(item.builtIn),
            usesSelectedEngine: Boolean(item.usesSelectedEngine)
        })),
        customEngines: state.customEngines.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            url: ensureQueryPlaceholder(item.url),
            queryMode: normalizeQueryMode(item.queryMode)
        })),
        customSearchUrl: ""
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
    const status = document.getElementById("status");

    const defaultEngineNameInput = document.getElementById("defaultEngineName");
    const defaultEngineUrlInput = document.getElementById("defaultEngineUrl");
    const addDefaultEngineBtn = document.getElementById("addDefaultEngineBtn");
    const defaultBuilderPreview = document.getElementById("defaultBuilderPreview");
    const defaultBuilderWarning = document.getElementById("defaultBuilderWarning");
    const defaultEnginesList = document.getElementById("defaultEnginesList");

    const menuItemsList = document.getElementById("menuItemsList");

    const customEngineNameInput = document.getElementById("customEngineName");
    const customEngineUrlInput = document.getElementById("customEngineUrl");
    const customEngineQueryModeSelect = document.getElementById("customEngineQueryMode");
    const addCustomEngineBtn = document.getElementById("addCustomEngineBtn");
    const customBuilderPreview = document.getElementById("customBuilderPreview");
    const customBuilderWarning = document.getElementById("customBuilderWarning");
    const customEnginesList = document.getElementById("customEnginesList");

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.className = "status";
        }, 3000);
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
        nameInput.addEventListener("input", () => { engine.name = nameInput.value; render(); });
        nameWrap.appendChild(nameInput);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = engine.url;
        urlInput.addEventListener("input", () => { engine.url = urlInput.value; render(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(urlWrap);

        const preview = document.createElement("div");
        preview.className = "preview";
        preview.textContent = `Example: ${buildSearchUrl(engine.url, state.searchQueryMode, state.suffix)}`;
        const warning = document.createElement("div");
        warning.className = `warning-box${isYandexUrl(engine.url) ? " show" : ""}`;
        if (isYandexUrl(engine.url)) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(preview);
        card.appendChild(warning);
        return card;
    }

    function createMenuItemCard(item, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        title.appendChild(createFaviconElement(item.url, item.name));
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
        nameInput.addEventListener("input", () => { item.name = nameInput.value; render(); });
        nameWrap.appendChild(nameInput);

        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, item.usesSelectedEngine);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; render(); });
        queryWrap.appendChild(querySelect);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.usesSelectedEngine
            ? (getSearchEngineById(state.searchEngineId)?.url || "")
            : item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; item.usesSelectedEngine = false; render(); });
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

        const preview = document.createElement("div");
        preview.className = "preview";
        preview.textContent = `Example: ${buildSearchUrl(item.url, item.queryMode, item.queryMode === "configured" ? state.suffix : "")}`;
        const warning = document.createElement("div");
        const shouldWarn = !item.usesSelectedEngine && isYandexUrl(item.url);
        warning.className = `warning-box${shouldWarn ? " show" : ""}`;
        if (shouldWarn) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(preview);
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
        title.appendChild(createFaviconElement(item.url, item.name));
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
        nameInput.addEventListener("input", () => { item.name = nameInput.value; render(); });
        nameWrap.appendChild(nameInput);

        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, false);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; render(); });
        queryWrap.appendChild(querySelect);

        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; render(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(queryWrap);
        fields.appendChild(urlWrap);

        const preview = document.createElement("div");
        preview.className = "preview";
        preview.textContent = `Example: ${buildSearchUrl(item.url, item.queryMode, "")}`;
        const warning = document.createElement("div");
        warning.className = `warning-box${isYandexUrl(item.url) ? " show" : ""}`;
        if (isYandexUrl(item.url)) {
            warning.innerHTML = getYandexWarningHtml();
        }
        card.appendChild(header);
        card.appendChild(fields);
        card.appendChild(preview);
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
        if (state.menuItems.length === 0) {
            menuItemsList.innerHTML = `<div class="empty-state">No quick search menu items.</div>`;
            return;
        }
        state.menuItems.forEach((item, index) => menuItemsList.appendChild(createMenuItemCard(item, index)));
    }

    function renderCustomEngines() {
        customEnginesList.innerHTML = "";
        if (state.customEngines.length === 0) {
            customEnginesList.innerHTML = `<div class="empty-state">No custom search engines yet.</div>`;
            return;
        }
        state.customEngines.forEach((item, index) => customEnginesList.appendChild(createCustomEngineCard(item, index)));
    }

    function render() {
        updateEngineSelect();
        searchQueryModeSelect.value = state.searchQueryMode;
        suffixInput.value = state.suffix;
        renderDefaultEngines();
        renderMenuItems();
        renderCustomEngines();
        updateSearchPreview();
        updateBuilderPreview();
    }

    try {
        state = normalizeSettings(await browser.storage.local.get(null));
        render();
    } catch (error) {
        console.error("Error loading settings:", error);
        showStatus("Error loading settings", "error");
        render();
    }

    engineSelect.addEventListener("change", () => {
        state.searchEngineId = engineSelect.value;
        render();
    });

    searchQueryModeSelect.addEventListener("change", () => {
        state.searchQueryMode = searchQueryModeSelect.value;
        updateSearchPreview();
    });

    suffixInput.addEventListener("input", () => {
        state.suffix = suffixInput.value;
        updateSearchPreview();
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
        render();
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
        render();
        showStatus("Search engine added to the draft list", "success");
    });
    saveBtn.addEventListener("click", async () => {
        state.suffix = suffixInput.value.trim();
        state.searchEngineId = engineSelect.value;
        state.searchQueryMode = searchQueryModeSelect.value;

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
            showStatus("Settings reset to defaults", "success");
        } catch (error) {
            console.error("Error resetting settings:", error);
            showStatus("Error resetting settings", "error");
        }
    });
});
