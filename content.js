
(function () {
    'use strict';

    const DEFAULT_SEARCH_ENGINES = [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', builtIn: true },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}', builtIn: true },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={query}', builtIn: true }
    ];

    const DEFAULT_MENU_ITEMS = [
        { id: 'menu_search', name: 'Search in new tab', url: '__DEFAULT_ENGINE__', queryMode: 'titleYear', usesSelectedEngine: true, builtIn: true },
        { id: 'menu_youtube', name: 'Search YouTube', url: 'https://www.youtube.com/results?search_query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true, malApiMode: 'none' },
        { id: 'menu_archive', name: 'Search Archive.org', url: 'https://archive.org/search?tab=all&query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_rutracker', name: 'Search RuTracker', url: 'https://rutracker.org/forum/tracker.php?nm={query}', queryMode: 'title', builtIn: true }
    ];

    function getTitleAndYear() {
        let title = document.querySelector('h1')?.innerText || '';
        title = title.replace(/\s*\(\d{4}\)\s*$/, '').trim();

        let year = '';
        const yearLink = document.querySelector('a[href*="releaseinfo"]');
        if (yearLink) {
            const match = yearLink.innerText.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        }
        if (!year) {
            const match = document.querySelector('h1')?.innerText.match(/\((\d{4})\)/);
            if (match) year = match[1];
        }

        return { title, year };
    }

    function getPosterUrl() {
        const selectors = [
            '[data-testid="hero-media__poster"] img',
            '.ipc-poster__poster-image img',
            'img.ipc-image[src*="_V1_"]',
            '.ipc-poster img'
        ];

        for (const selector of selectors) {
            const img = document.querySelector(selector);
            if (img && img.src) {
                return img.src.replace(/_V1_.*\./, '_V1_FMjpg_UX1000_.');
            }
        }

        return '';
    }

    function ensureQueryPlaceholder(url) {
        const trimmed = (url || '').trim();
        if (!trimmed || trimmed === '__DEFAULT_ENGINE__') {
            return trimmed;
        }
        const hasCustom = trimmed.includes('{title}') || trimmed.includes('{year}');
        if (hasCustom) return trimmed;
        return trimmed.includes('{query}') ? trimmed : `${trimmed}{query}`;
    }

    function normalizeQueryMode(mode, fallback = 'titleYear') {
        return ['title', 'titleYear', 'configured'].includes(mode) ? mode : fallback;
    }

    function normalizeSearchEngine(raw, fallback = {}) {
        return {
            id: raw?.id || fallback.id || `engine_${Date.now()}`,
            name: raw?.name || fallback.name || 'Search Engine',
            url: ensureQueryPlaceholder(raw?.url || fallback.url || ''),
            builtIn: Boolean(raw?.builtIn ?? fallback.builtIn)
        };
    }

    function normalizeMenuItem(raw, fallback = {}) {
        const url = raw?.usesSelectedEngine ? '__DEFAULT_ENGINE__' : raw?.url ?? fallback.url ?? '';
        const rawMalMode = raw?.malApiMode || fallback.malApiMode || 'none';
        const rawImdbMode = raw?.imdbApiMode || fallback.imdbApiMode || 'none';
        return {
            id: raw?.id || fallback.id || `menu_${Date.now()}`,
            name: raw?.name || fallback.name || 'Quick Search Item',
            url: url === '__DEFAULT_ENGINE__' ? '__DEFAULT_ENGINE__' : ensureQueryPlaceholder(url),
            queryMode: normalizeQueryMode(raw?.queryMode, fallback.queryMode || 'titleYear'),
            usesSelectedEngine: url === '__DEFAULT_ENGINE__' || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine),
            iconUrl: raw?.iconUrl || '',
            malApiMode: ['none', 'split', 'always'].includes(rawMalMode) ? rawMalMode : 'none',
            imdbApiMode: ['none', 'split', 'always'].includes(rawImdbMode) ? rawImdbMode : 'none'
        };
    }

    function normalizeCustomEngine(raw) {
        return {
            id: raw?.id || `custom_${Date.now()}`,
            name: raw?.name || 'Custom Search',
            url: ensureQueryPlaceholder(raw?.url || ''),
            queryMode: normalizeQueryMode(raw?.queryMode, 'titleYear'),
            iconUrl: raw?.iconUrl || '',
            malApiMode: ['none', 'split', 'always'].includes(raw?.malApiMode) ? raw.malApiMode : 'none',
            imdbApiMode: ['none', 'split', 'always'].includes(raw?.imdbApiMode) ? raw.imdbApiMode : 'none'
        };
    }

    function getProfileIdForHost() {
        return 'imdb';
    }

    function normalizeSettings(data, overrideProfileId) {
        const searchEngines = Array.isArray(data.searchEngines) && data.searchEngines.length > 0
            ? data.searchEngines.map((item, index) => normalizeSearchEngine(item, DEFAULT_SEARCH_ENGINES[index] || DEFAULT_SEARCH_ENGINES[0]))
            : DEFAULT_SEARCH_ENGINES.map((item) => normalizeSearchEngine(item, item));

        let searchEngineId = data.searchEngineId || data.searchEngine || searchEngines[0]?.id || 'google';
        if (!searchEngines.some((engine) => engine.id === searchEngineId)) {
            searchEngineId = searchEngines[0]?.id || 'google';
        }

        let suffix = typeof data.suffix === 'string' ? data.suffix : 'watch';
        let searchQueryMode = normalizeQueryMode(data.searchQueryMode, 'titleYear');
        let menuItems = Array.isArray(data.menuItems) && data.menuItems.length > 0
            ? data.menuItems.map((item, index) => normalizeMenuItem(item, DEFAULT_MENU_ITEMS[index] || DEFAULT_MENU_ITEMS[0]))
            : DEFAULT_MENU_ITEMS.map((item) => normalizeMenuItem(item, item));
        let customEngines = Array.isArray(data.customEngines)
            ? data.customEngines.map(normalizeCustomEngine)
            : [];

        if (data.profiles) {
            const profileId = overrideProfileId || getProfileIdForHost();
            const profile = data.profiles[profileId];
            if (profile) {
                suffix = typeof profile.suffix === 'string' ? profile.suffix : suffix;
                searchQueryMode = normalizeQueryMode(profile.searchQueryMode, searchQueryMode);
                menuItems = Array.isArray(profile.menuItems)
                    ? profile.menuItems.map((item, index) => normalizeMenuItem(item, DEFAULT_MENU_ITEMS[index] || DEFAULT_MENU_ITEMS[0]))
                    : menuItems;
                customEngines = Array.isArray(profile.customEngines)
                    ? profile.customEngines.map(normalizeCustomEngine)
                    : customEngines;
            }
        }

        const malQuickLink = typeof data.malQuickLink === 'boolean' ? data.malQuickLink : true;

        return {
            suffix,
            searchEngineId,
            searchQueryMode,
            searchEngines,
            menuItems,
            customEngines,
            malQuickLink
        };
    }

    function getSelectedEngine(settings) {
        return settings.searchEngines.find((engine) => engine.id === settings.searchEngineId) || settings.searchEngines[0];
    }

    function buildQuery(title, year, mode, suffix = '') {
        const effectiveMode = mode === 'configured' ? 'titleYear' : mode;
        const yearPart = effectiveMode === 'title' ? '' : year || '';
        return [title || '', yearPart, suffix].filter(Boolean).join(' ').trim();
    }

    function buildUrl(url, query, title, year, settings, mode) {
        let targetUrl = url;
        let effectiveMode = mode;
        if (url === '__DEFAULT_ENGINE__') {
            const selectedEngine = getSelectedEngine(settings);
            targetUrl = selectedEngine?.url || DEFAULT_SEARCH_ENGINES[0].url;
            effectiveMode = mode === 'configured' ? settings.searchQueryMode : mode;
        }
        return ensureQueryPlaceholder(targetUrl)
            .replace('{query}', encodeURIComponent(query))
            .replace(/\{title\}/g, encodeURIComponent(title || ''))
            .replace(/\{year\}/g, encodeURIComponent(year || ''));
    }

    function extractTargetDomainFromQuery(url) {
    try {
        const testUrl = url.replace(/\{query\}/g, "test").replace(/\{title\}/g, "test").replace(/\{year\}/g, "2000");
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

    function getFaviconUrl(url, settings) {
        const targetUrl = url === '__DEFAULT_ENGINE__' 
            ? getSelectedEngine(settings)?.url 
            : url;

        if (!targetUrl) return '';
        const targetDomain = extractTargetDomainFromQuery(targetUrl);
        if (targetDomain) {
            const protocol = targetUrl.startsWith('https://') ? 'https:' : 'http:';
            return `${protocol}//${targetDomain}/favicon.ico`;
        }
        try {
            const parsed = new URL(targetUrl.replace(/\{query\}/g, 'test').replace(/\{title\}/g, 'test').replace(/\{year\}/g, '2000'));
            return `${parsed.origin}/favicon.ico`;
        } catch (error) {
            return '';
        }
    }

    async function jikanSearchAnime(title) {
        try {
            const json = await browser.runtime.sendMessage({
                type: "apiFetch",
                url: `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
            });
            if (json && json.data && json.data.length > 0) return json.data[0].url;
        } catch {}
        return null;
    }

    let currentModal = null;
    let escHandler = null;

    function closeMenu() {
        if (currentModal) {
            currentModal.remove();
            currentModal = null;
            document.body.style.overflow = '';
        }
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
    }

    function createButton() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ipc-split-button ipc-btn--theme-baseAlt ipc-split-button--ellide-false ipc-split-button--button-radius ipc-btn--core-accent1 ipc-split-button--width-full';
        wrapper.id = 'imdb-search-btn';
        wrapper.style.marginBottom = '12px';

        const mainBtn = document.createElement('button');
        mainBtn.className = 'ipc-split-button__btn ipc-split-button__btn--button-radius';
        mainBtn.type = 'button';

        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        icon.setAttribute('width', '24');
        icon.setAttribute('height', '24');
        icon.setAttribute('class', 'ipc-icon ipc-icon--search ipc-btn__icon ipc-btn__icon--pre');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'currentColor');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l-.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
        icon.appendChild(path);

        const textDiv = document.createElement('div');
        textDiv.className = 'ipc-btn__text';
        const searchDiv = document.createElement('div');
        searchDiv.textContent = "rer\u00e9:Search";
        textDiv.appendChild(searchDiv);
        mainBtn.appendChild(icon);
        mainBtn.appendChild(textDiv);

        mainBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { title, year } = getTitleAndYear();
    try {
        const data = await storageGet(null);
        const profiles = data.profiles || {};
                const hasAnySite = Object.values(profiles).some(p => p.site && p.site !== "\u2014");
                const matchingEntry = Object.entries(profiles).find(([, p]) => p.site === "imdb");
                if (!hasAnySite || !matchingEntry) {
                    if (currentModal) { closeMenu(); return; }
                    currentModal = createModal(title, year, getPosterUrl());
                    document.body.appendChild(currentModal);
                    document.body.style.overflow = 'hidden';
                    return;
                }
                const settings = normalizeSettings(data, matchingEntry[0]);
                const selectedEngine = getSelectedEngine(settings);
                const query = buildQuery(title, year, settings.searchQueryMode, settings.suffix);
                window.open(buildUrl(selectedEngine.url, query, title, year, settings, settings.searchQueryMode), '_blank');
            } catch (error) {
                console.error('Error loading search settings:', error);
                if (currentModal) { closeMenu(); return; }
                currentModal = createModal(title, year, getPosterUrl());
                document.body.appendChild(currentModal);
                document.body.style.overflow = 'hidden';
            }
        };

        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'ipc-split-button__iconBtn ipc-split-button__iconBtn--button-radius';
        dropdownBtn.type = 'button';
        dropdownBtn.setAttribute('aria-label', 'More options');

        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        arrow.setAttribute('width', '24');
        arrow.setAttribute('height', '24');
        arrow.setAttribute('class', 'ipc-icon ipc-icon--arrow ipc-btn__icon');
        arrow.setAttribute('viewBox', '0 0 24 24');
        arrow.setAttribute('fill', 'currentColor');
        const arrowPath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath1.setAttribute('opacity', '.87');
        arrowPath1.setAttribute('fill', 'none');
        arrowPath1.setAttribute('d', 'M24 24H0V0h24v24z');
        const arrowPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath2.setAttribute('d', 'M15.88 9.29L12 13.17 8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.39-.38-1.03-.39-1.42 0z');
        arrow.appendChild(arrowPath1);
        arrow.appendChild(arrowPath2);
        dropdownBtn.appendChild(arrow);

        dropdownBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentModal) {
                closeMenu();
                return;
            }
            const { title, year } = getTitleAndYear();
            currentModal = createModal(title, year, getPosterUrl());
            document.body.appendChild(currentModal);
            document.body.style.overflow = 'hidden';
        };

        wrapper.appendChild(mainBtn);
        wrapper.appendChild(dropdownBtn);
        return wrapper;
    }

    function addButton() {
        if (document.querySelector('#imdb-search-btn')) return;
        const btn = createButton();
        storageGet(["imdbEnabled", "imdbButtonLabel"]).then(data => {
            if (data.imdbEnabled === false) { btn.remove(); return; }
            const sd = btn.querySelector('.ipc-btn__text div');
            if (sd) sd.textContent = data.imdbButtonLabel === "search" ? "Search" : "rer\u00e9:Search";
        });
        const wlBtn = document.querySelector('[data-testid="tm-box-wl-button"]');
        if (wlBtn) {
            const container = wlBtn.closest('.sc-dcb1530e-3') || wlBtn.parentElement?.parentElement;
            if (container) {
                container.insertBefore(btn, container.firstChild);
                return;
            }
        }
        const targetContainer = document.querySelector('.sc-dcb1530e-3') ||
            document.querySelector('.ipc-split-button.ipc-btn--theme-baseAlt');
        if (targetContainer && targetContainer.parentElement) {
            targetContainer.parentElement.insertBefore(btn, targetContainer);
        } else {
            const rightColumn = document.querySelector('[data-testid="hero-parent"] .sc-89427c75-12') ||
                document.querySelector('.ipc-page-content-container--center > div:last-child');
            if (rightColumn) {
                rightColumn.insertBefore(btn, rightColumn.firstChild);
            }
        }
    }

    function createMenuLink(item) {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;align-items:center;padding:0 24px;transition:background 0.2s;';
        container.onmouseenter = () => { container.style.background = '#333'; };
        container.onmouseleave = () => { container.style.background = 'transparent'; };

        const link = document.createElement('a');
        link.href = '#';
        link.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 0;color:#fff;text-decoration:none;cursor:pointer;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;flex:1;min-width:0;';
        if (item.iconUrl) {
            const icon = document.createElement('img');
            icon.src = item.iconUrl;
            icon.alt = '';
            icon.referrerPolicy = 'no-referrer';
            icon.style.cssText = 'width:18px;height:18px;border-radius:4px;flex-shrink:0;background:rgba(255,255,255,0.08);';
            icon.onerror = () => { icon.style.display = 'none'; };
            link.appendChild(icon);
        }
        const text = document.createElement('span');
        text.textContent = item.text;
        link.appendChild(text);
        link.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            window.open(item.url, '_blank');
        };

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:4px;flex-shrink:0;margin-left:auto;padding-left:12px;';

        function createIconBtn(svgPath, title, url, btnStyle) {
            if (!url) return null;
            const btn = document.createElement('button');
            btn.title = title;
            btn.style.cssText = btnStyle || 'width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);cursor:pointer;color:#999;display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.15s;';
            if (!btnStyle) {
                btn.onmouseenter = () => { btn.style.background = 'rgba(255,255,255,0.15)'; btn.style.color = '#fff'; };
                btn.onmouseleave = () => { btn.style.background = 'rgba(255,255,255,0.05)'; btn.style.color = '#999'; };
            }
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '13');
            svg.setAttribute('height', '13');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'currentColor');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', svgPath);
            svg.appendChild(path);
            btn.appendChild(svg);
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                closeMenu();
                window.open(url, '_blank');
            };
            return btn;
        }

        if (item.malApiUrl) {
            const apiBtn = createIconBtn('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', 'Open on MyAnimeList (API)', item.malApiUrl);
            if (apiBtn) btnGroup.appendChild(apiBtn);
        }
        const titleBtn = createIconBtn('M5 4h14v3h-5.5v13h-3V7H5V4z', 'Search by title only', item.urlTitle);
        if (titleBtn) btnGroup.appendChild(titleBtn);

        const yearBtn = createIconBtn('M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', 'Search by title and year', item.urlTitleYear);
        if (yearBtn) btnGroup.appendChild(yearBtn);

        container.appendChild(link);
        container.appendChild(btnGroup);
        return container;
    }

    async function _jikanSearchCached(title, cache) {
        if (cache[title]) return cache[title];
        const url = await jikanSearchAnime(title);
        cache[title] = url;
        return url;
    }

    async function getMenuItems(title, year, overrideProfileId) {
        try {
            const settings = normalizeSettings(await storageGet(null), overrideProfileId);
            const items = [];
            const apiTasks = [];
            const jikanCache = {};
            const isMalUrl = (url) => (url || '').toLowerCase().includes('myanimelist.net');
            let hasMalApiItem = false;

            function processItem(rawItem) {
                const mode = rawItem.usesSelectedEngine && rawItem.queryMode === 'configured' ? settings.searchQueryMode : rawItem.queryMode;
                const suffix = rawItem.usesSelectedEngine && rawItem.queryMode === 'configured' ? settings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                const titleQuery = buildQuery(title, year, 'title', '');
                const titleYearQuery = buildQuery(title, year, 'titleYear', '');
                const resolvedUrl = buildUrl(rawItem.url, query, title, year, settings, rawItem.queryMode);
                const resolvedUrlTitle = buildUrl(rawItem.url, titleQuery, title, year, settings, rawItem.queryMode);
                const resolvedUrlYear = buildUrl(rawItem.url, titleYearQuery, title, year, settings, rawItem.queryMode);

                const normalItem = {
                    text: rawItem.name,
                    url: resolvedUrl,
                    urlTitle: resolvedUrlTitle,
                    urlTitleYear: resolvedUrlYear,
                    iconUrl: rawItem.iconUrl || getFaviconUrl(rawItem.url, settings)
                };
                items.push(normalItem);

                const isMal = isMalUrl(rawItem.url) && ['split', 'always'].includes(rawItem.malApiMode);

                if (isMal) {
                    const malMode = rawItem.malApiMode;
                    apiTasks.push(_jikanSearchCached(title, jikanCache).then(url => {
                        if (url) {
                            hasMalApiItem = true;
                            if (malMode === 'always') normalItem.url = url;
                            else normalItem.malApiUrl = url;
                        }
                    }));
                }
            }

            for (const rawItem of settings.menuItems) processItem(rawItem);
            if (settings.customEngines.length > 0 && items.length > 0) items.push({ isDivider: true });
            for (const rawItem of settings.customEngines) processItem(rawItem);

            if (settings.malQuickLink) {
                apiTasks.push(_jikanSearchCached(title, jikanCache).then(url => {
                    if (url && !hasMalApiItem) {
                        items.unshift({
                            text: 'Open on MyAnimeList',
                            url: url,
                            urlTitle: url,
                            urlTitleYear: url,
                            iconUrl: 'https://myanimelist.net/favicon.ico'
                        });
                    }
                }));
            }

            return {
                items,
                resolve: () => Promise.allSettled(apiTasks).then(() => items)
            };
        } catch (error) {
            console.error('Error loading menu settings:', error);
            const fallbackSettings = normalizeSettings({});
            const fallback = DEFAULT_MENU_ITEMS.map((item) => {
                const mode = item.queryMode === 'configured' ? fallbackSettings.searchQueryMode : item.queryMode;
                const suffix = item.queryMode === 'configured' ? fallbackSettings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                const titleQuery = buildQuery(title, year, 'title', '');
                const titleYearQuery = buildQuery(title, year, 'titleYear', '');
                return {
                    text: item.name,
                    url: buildUrl(item.url, query, title, year, fallbackSettings, item.queryMode),
                    urlTitle: buildUrl(item.url, titleQuery, title, year, fallbackSettings, item.queryMode),
                    urlTitleYear: buildUrl(item.url, titleYearQuery, title, year, fallbackSettings, item.queryMode),
                    iconUrl: getFaviconUrl(item.url, fallbackSettings)
                };
            });
            return { items: fallback, resolve: () => Promise.resolve(fallback) };
        }
    }

    function createModal(title, year, posterUrl) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border-radius:8px;max-width:640px;width:100%;max-height:90vh;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;overflow:hidden;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:18px;line-height:1;z-index:10;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; };
        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

        const leftPanel = document.createElement('div');
        leftPanel.style.cssText = 'width:220px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:20px 0 20px 20px;';

        const coverContainer = document.createElement('div');
        coverContainer.style.cssText = 'width:200px;position:relative;border-radius:6px;overflow:hidden;cursor:pointer;transform-style:preserve-3d;transition:transform 0.1s ease-out;';
        coverContainer.style.perspective = '600px';

        const coverImg = document.createElement('img');
        if (posterUrl) {
            coverImg.src = posterUrl;
        } else {
            coverImg.style.display = 'none';
        }
        coverImg.alt = title;
        coverImg.style.cssText = 'display:block;width:100%;height:auto;border-radius:6px;background:#2a2a2a;';
        coverImg.onerror = () => { coverImg.style.display = 'none'; };
        coverContainer.appendChild(coverImg);

        const glare = document.createElement('div');
        glare.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;border-radius:6px;pointer-events:none;transition:background 0.1s ease-out;';
        coverContainer.appendChild(glare);

        const shine = document.createElement('div');
        shine.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;border-radius:6px;pointer-events:none;background:linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.04) 100%);';
        coverContainer.appendChild(shine);

        coverContainer.addEventListener('mouseenter', () => {
            coverContainer.style.transform = 'perspective(600px) translateY(-2px) scale3d(1.03,1.03,1.03)';
            coverContainer.style.transition = 'transform 0.2s ease-out';
        });
        coverContainer.addEventListener('mousemove', (e) => {
            const rect = coverContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotX = (y - 0.5) * -20;
            const rotY = (x - 0.5) * 20;
            coverContainer.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
            const glareX = x * 100;
            const glareY = y * 100;
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)`;
        });

        coverContainer.addEventListener('mouseleave', () => {
            coverContainer.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
            glare.style.background = 'transparent';
        });

        leftPanel.appendChild(coverContainer);

        const profileSelect = document.createElement('select');
        profileSelect.style.cssText = 'margin-top:14px;width:200px;font-size:12px;padding:2px 6px;border-radius:3px;border:1px solid #333;background:#1a1a1a;color:#fff;cursor:pointer;outline:none;';
        leftPanel.appendChild(profileSelect);

        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;';

        const header = document.createElement('div');
        header.style.cssText = 'padding:20px 48px 14px 24px;border-bottom:1px solid #333;';

        const h3 = document.createElement('h3');
        h3.style.cssText = 'margin:0 0 6px 0;color:#fff;font-size:20px;font-weight:500;';
        h3.textContent = 'Quick rer\u00e9:Search';
        header.appendChild(h3);

        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'color:#aaa;font-size:14px;';
        titleDiv.textContent = year ? `${title} (${year})` : title;
        header.appendChild(titleDiv);

        const listContainer = document.createElement('div');
        listContainer.style.padding = '8px 0';

        function renderItemList(items) {
            listContainer.innerHTML = '';
            items.forEach((item, index) => {
                if (item.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top:1px solid #333;margin:0;width:100%;';
                    listContainer.appendChild(divider);
                    return;
                }
                listContainer.appendChild(createMenuLink(item));
                if (index < items.length - 1 && !items[index + 1]?.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top:1px solid #333;margin:0;width:100%;';
                    listContainer.appendChild(divider);
                }
            });
        }

        function renderMenuItems(profileId) {
            listContainer.innerHTML = '';
            getMenuItems(title, year, profileId).then(({ items, resolve }) => {
                renderItemList(items);
                resolve().then(updated => { renderItemList(updated); });
            });
        }

        storageGet(null).then((data) => {
            const currentProfileId = getProfileIdForHost();
            const profiles = data.profiles || {};
            const allIds = Object.keys(profiles);
            if (allIds.length > 0) {
                allIds.forEach((id) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = profiles[id]?.name || id;
                    if (id === currentProfileId) option.selected = true;
                    profileSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = currentProfileId;
                option.textContent = currentProfileId;
                option.selected = true;
                profileSelect.appendChild(option);
            }
            renderMenuItems(profileSelect.value);
        });

        profileSelect.addEventListener('change', () => {
            renderMenuItems(profileSelect.value);
        });

        rightPanel.appendChild(header);
        rightPanel.appendChild(listContainer);

        modal.appendChild(closeBtn);
        modal.appendChild(leftPanel);
        modal.appendChild(rightPanel);
        overlay.appendChild(modal);
        overlay.onclick = (e) => { if (e.target === overlay) closeMenu(); };
        escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } };
        document.addEventListener('keydown', escHandler);
        return overlay;
    }

    const selectors = [
        '[data-testid="tm-box-wl-button"]',
        '[data-testid="poster-watchlist-ribbon-add"]',
        '.ipc-watchlist-ribbon',
        'button[aria-label*="Watchlist"]',
        'button[aria-label*="watchlist"]',
        '.sc-dcb1530e-3',
        '.ipc-split-button.ipc-btn--theme-baseAlt'
    ];

    function tryAddButton() {
        for (const selector of selectors) {
            if (document.querySelector(selector)) {
                addButton();
                return true;
            }
        }
        return false;
    }

    if (!tryAddButton()) {
        const observer = new MutationObserver(() => {
            if (tryAddButton()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 10000);
    }

    if (window.history?.pushState) {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            setTimeout(() => {
                if (!document.querySelector('#imdb-search-btn')) {
                    tryAddButton();
                }
            }, 500);
        };
    }
})();
