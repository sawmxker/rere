
(function () {
    'use strict';

    const DEFAULT_SEARCH_ENGINES = [
        { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', builtIn: true },
        { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}', builtIn: true },
        { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={query}', builtIn: true }
    ];

    const DEFAULT_MENU_ITEMS = [
        { id: 'menu_info', name: 'Search in new tab (info)', url: '__DEFAULT_ENGINE__', queryMode: 'configured', usesSelectedEngine: true, builtIn: true },
        { id: 'menu_title', name: 'Search in new tab (by title)', url: '__DEFAULT_ENGINE__', queryMode: 'title', usesSelectedEngine: true, builtIn: true },
        { id: 'menu_youtube', name: 'Search YouTube', url: 'https://www.youtube.com/results?search_query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'titleYear', builtIn: true },
        { id: 'menu_archive', name: 'Search Archive.org', url: 'https://archive.org/search?query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_animetosho', name: 'Search Animetosho', url: 'https://animetosho.org/search?q={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_torrents', name: 'Search Torrents', url: 'https://1337x.to/search/{query}/1/', queryMode: 'title', builtIn: true },
        { id: 'menu_rutracker', name: 'Search RuTracker', url: 'https://rutracker.org/forum/tracker.php?nm={query}', queryMode: 'titleYear', builtIn: true }
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
        return {
            id: raw?.id || fallback.id || `menu_${Date.now()}`,
            name: raw?.name || fallback.name || 'Quick Search Item',
            url: url === '__DEFAULT_ENGINE__' ? '__DEFAULT_ENGINE__' : ensureQueryPlaceholder(url),
            queryMode: normalizeQueryMode(raw?.queryMode, fallback.queryMode || 'titleYear'),
            usesSelectedEngine: url === '__DEFAULT_ENGINE__' || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine)
        };
    }

    function normalizeCustomEngine(raw) {
        return {
            id: raw?.id || `custom_${Date.now()}`,
            name: raw?.name || 'Custom Search',
            url: ensureQueryPlaceholder(raw?.url || ''),
            queryMode: normalizeQueryMode(raw?.queryMode, 'titleYear')
        };
    }

    function normalizeSettings(data) {
        const searchEngines = Array.isArray(data.searchEngines) && data.searchEngines.length > 0
            ? data.searchEngines.map((item, index) => normalizeSearchEngine(item, DEFAULT_SEARCH_ENGINES[index] || DEFAULT_SEARCH_ENGINES[0]))
            : DEFAULT_SEARCH_ENGINES.map((item) => normalizeSearchEngine(item, item));
        const menuItems = Array.isArray(data.menuItems) && data.menuItems.length > 0
            ? data.menuItems.map((item, index) => normalizeMenuItem(item, DEFAULT_MENU_ITEMS[index] || DEFAULT_MENU_ITEMS[0]))
            : DEFAULT_MENU_ITEMS.map((item) => normalizeMenuItem(item, item));
        const customEngines = Array.isArray(data.customEngines)
            ? data.customEngines.map(normalizeCustomEngine)
            : [];

        let searchEngineId = data.searchEngineId || data.searchEngine || searchEngines[0]?.id || 'google';
        if (!searchEngines.some((engine) => engine.id === searchEngineId)) {
            searchEngineId = searchEngines[0]?.id || 'google';
        }

        return {
            suffix: typeof data.suffix === 'string' ? data.suffix : 'watch',
            searchEngineId,
            searchQueryMode: normalizeQueryMode(data.searchQueryMode, 'titleYear'),
            searchEngines,
            menuItems,
            customEngines
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

    function buildUrl(url, query, settings, mode) {
        let targetUrl = url;
        let effectiveMode = mode;
        if (url === '__DEFAULT_ENGINE__') {
            const selectedEngine = getSelectedEngine(settings);
            targetUrl = selectedEngine?.url || DEFAULT_SEARCH_ENGINES[0].url;
            effectiveMode = mode === 'configured' ? settings.searchQueryMode : mode;
        }
        return ensureQueryPlaceholder(targetUrl).replace('{query}', encodeURIComponent(query));
    }

    function getFaviconUrl(url, settings) {
        const targetUrl = url === '__DEFAULT_ENGINE__' ? getSelectedEngine(settings)?.url : url;
        try {
            const parsed = new URL((targetUrl || '').replace('{query}', 'test'));
            return `${parsed.origin}/favicon.ico`;
        } catch (error) {
            return '';
        }
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
        searchDiv.textContent = 'Search';
        textDiv.appendChild(searchDiv);
        mainBtn.appendChild(icon);
        mainBtn.appendChild(textDiv);

        mainBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { title, year } = getTitleAndYear();
            try {
                const settings = normalizeSettings(await browser.storage.local.get(null));
                const selectedEngine = getSelectedEngine(settings);
                const query = buildQuery(title, year, settings.searchQueryMode, settings.suffix);
                window.open(buildUrl(selectedEngine.url, query, settings, settings.searchQueryMode), '_blank');
            } catch (error) {
                console.error('Error loading search settings:', error);
                const fallbackSettings = normalizeSettings({});
                const fallbackEngine = getSelectedEngine(fallbackSettings);
                const query = buildQuery(title, year, 'titleYear', 'watch');
                window.open(buildUrl(fallbackEngine.url, query, fallbackSettings, 'titleYear'), '_blank');
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
        const targetContainer = document.querySelector('.ipc-page-content-container--center .sc-51b56837-0') ||
            document.querySelector('[data-testid="hero-media__watchlist"]') ||
            document.querySelector('.ipc-split-button.AkkKS');
        if (targetContainer && targetContainer.parentElement) {
            targetContainer.parentElement.insertBefore(btn, targetContainer);
        } else {
            const rightColumn = document.querySelector('.sc-51b56837-0')?.parentElement?.parentElement;
            if (rightColumn) {
                rightColumn.insertBefore(btn, rightColumn.firstChild);
            }
        }
    }

    function createMenuLink(item) {
        const link = document.createElement('a');
        link.href = '#';
        link.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 24px;color:#fff;text-decoration:none;cursor:pointer;transition:background 0.2s;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
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
        link.onmouseenter = () => { link.style.background = '#333'; };
        link.onmouseleave = () => { link.style.background = 'transparent'; };
        link.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenu();
            window.open(item.url, '_blank');
        };
        return link;
    }

    async function getMenuItems(title, year) {
        try {
            const settings = normalizeSettings(await browser.storage.local.get(null));
            const items = [];
            settings.menuItems.forEach((item) => {
                const mode = item.usesSelectedEngine && item.queryMode === 'configured' ? settings.searchQueryMode : item.queryMode;
                const suffix = item.usesSelectedEngine && item.queryMode === 'configured' ? settings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                items.push({
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    iconUrl: getFaviconUrl(item.url, settings)
                });
            });
            if (settings.customEngines.length > 0 && items.length > 0) {
                items.push({ isDivider: true });
            }
            settings.customEngines.forEach((item) => {
                const query = buildQuery(title, year, item.queryMode, '');
                items.push({
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    iconUrl: getFaviconUrl(item.url, settings)
                });
            });
            return items;
        } catch (error) {
            console.error('Error loading menu settings:', error);
            const settings = normalizeSettings({});
            return DEFAULT_MENU_ITEMS.map((item) => {
                const mode = item.queryMode === 'configured' ? settings.searchQueryMode : item.queryMode;
                const suffix = item.queryMode === 'configured' ? settings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                return {
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    iconUrl: getFaviconUrl(item.url, settings)
                };
            });
        }
    }

    function createModal(title, year, posterUrl) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border-radius:8px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid #333;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:18px;line-height:1;z-index:10;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255,255,255,0.1)'; };
        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

        const header = document.createElement('div');
        header.style.cssText = 'padding:24px 24px 16px;border-bottom:1px solid #333;display:flex;gap:16px;align-items:flex-start;';
        if (posterUrl) {
            const posterImg = document.createElement('img');
            posterImg.src = posterUrl;
            posterImg.alt = title;
            posterImg.style.cssText = 'width:80px;height:120px;object-fit:cover;border-radius:4px;flex-shrink:0;background:#2a2a2a;';
            posterImg.onerror = () => { posterImg.style.display = 'none'; };
            header.appendChild(posterImg);
        }

        const headerText = document.createElement('div');
        headerText.style.flex = '1';
        const h3 = document.createElement('h3');
        h3.style.cssText = 'margin:0 0 8px 0;color:#fff;font-size:20px;font-weight:500;';
        h3.textContent = 'Quick Search';
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'color:#aaa;font-size:14px;';
        titleDiv.textContent = year ? `${title} (${year})` : title;
        headerText.appendChild(h3);
        headerText.appendChild(titleDiv);
        header.appendChild(headerText);

        const listContainer = document.createElement('div');
        listContainer.style.padding = '8px 0';

        getMenuItems(title, year).then((items) => {
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
        });

        modal.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(listContainer);
        overlay.appendChild(modal);
        overlay.onclick = (e) => { if (e.target === overlay) closeMenu(); };
        escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeMenu(); } };
        document.addEventListener('keydown', escHandler);
        return overlay;
    }

    const selectors = [
        '[data-testid="hero-media__watchlist"]',
        '[data-testid="poster-watchlist-ribbon-add"]',
        '.ipc-watchlist-ribbon',
        '[data-testid="tm-box-wl-button"]',
        'button[aria-label*="Watchlist"]',
        'button[aria-label*="watchlist"]',
        '.sc-51b56837-0'
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
