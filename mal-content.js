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
        { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_mal_visit', name: 'Visit MyAnimeList page', url: 'https://www.google.com/search?q=site:myanimelist.net+{query}&btnI', queryMode: 'titleYear', builtIn: true },
        { id: 'menu_archive', name: 'Search Archive.org', url: 'https://archive.org/search?query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_animetosho', name: 'Search Animetosho', url: 'https://animetosho.org/search?q={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_rutracker', name: 'Search RuTracker', url: 'https://rutracker.org/forum/tracker.php?nm={query}', queryMode: 'titleYear', builtIn: true }
    ];

    function isDarkMode() {
        return document.documentElement.classList.contains('dark-mode');
    }

    function getTitleAndYear() {
        let title = '';
        const titleEl = document.querySelector('h1.title-name strong') ||
                        document.querySelector('h1.h1_bold_none strong') ||
                        document.querySelector('h1.title-name') ||
                        document.querySelector('[itemprop="name"] h1');
        if (titleEl) {
            title = titleEl.innerText.replace(/\s*\(TV.*?\)\s*$/, '').replace(/\s*\(Movie\)\s*$/, '').replace(/\s*\(\w+ \d{4}\)\s*$/, '').trim();
        }

        let year = '';
        const h1 = document.querySelector('h1');
        if (h1) {
            const match = h1.innerText.match(/\((\d{4})\)/);
            if (match) year = match[1];
        }
        if (!year) {
            const seasonEl = document.querySelector('.information.season a');
            if (seasonEl) {
                const match = seasonEl.innerText.match(/\b(19|20)\d{2}\b/);
                if (match) year = match[0];
            }
        }
        if (!year) {
            const pads = document.querySelectorAll('.spaceit_pad');
            for (const pad of pads) {
                const dt = pad.querySelector('.dark_text');
                if (dt && dt.textContent.trim() === 'Aired:') {
                    const match = pad.textContent.match(/\b(19|20)\d{2}\b/);
                    if (match) { year = match[0]; break; }
                }
            }
        }

        return { title, year };
    }

    function getPosterUrl() {
        const img = document.querySelector('img[itemprop="image"]');
        if (img && img.src) {
            return img.src.replace(/\/r\/\d+x\d+/, '');
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
            usesSelectedEngine: url === '__DEFAULT_ENGINE__' || Boolean(raw?.usesSelectedEngine ?? fallback.usesSelectedEngine),
            iconUrl: raw?.iconUrl || ''
        };
    }

    function normalizeCustomEngine(raw) {
        return {
            id: raw?.id || `custom_${Date.now()}`,
            name: raw?.name || 'Custom Search',
            url: ensureQueryPlaceholder(raw?.url || ''),
            queryMode: normalizeQueryMode(raw?.queryMode, 'titleYear'),
            iconUrl: raw?.iconUrl || ''
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
            const parsed = new URL(targetUrl.replace('{query}', 'test'));
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
        const dark = isDarkMode();
        const baseColor = dark ? '#4f74c8' : '#2e51a2';
        const hoverColor = '#4065ba';

        const wrapper = document.createElement('div');
        wrapper.id = 'mal-search-btn';
        wrapper.style.cssText = 'display:flex;width:100%;margin-top:8px;margin-bottom:4px;';

        const mainBtn = document.createElement('a');
        mainBtn.href = '#';
        mainBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:4px;flex:1;padding:5px 0;font-size:11px;font-weight:bold;font-family:Verdana,Arial;color:#fff;text-decoration:none;line-height:normal;cursor:pointer;box-sizing:border-box;background:' + baseColor + ';border:none;border-radius:4px 0 0 4px;margin:0;';

        const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        searchIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        searchIcon.setAttribute('width', '11');
        searchIcon.setAttribute('height', '11');
        searchIcon.setAttribute('viewBox', '0 0 24 24');
        searchIcon.setAttribute('fill', 'currentColor');
        searchIcon.style.cssText = 'display:block;flex-shrink:0;';
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('d', 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l-.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
        searchIcon.appendChild(iconPath);
        mainBtn.appendChild(searchIcon);

        const txt = document.createElement('span');
        txt.textContent = 'reré: search';
        mainBtn.appendChild(txt);

        const dropdownBtn = document.createElement('a');
        dropdownBtn.href = '#';
        dropdownBtn.setAttribute('aria-label', 'More options');
        dropdownBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:5px;min-width:32px;color:#fff;text-decoration:none;line-height:1;cursor:pointer;box-sizing:border-box;background:' + baseColor + ';border:none;border-left:1px solid rgba(255,255,255,0.18);border-radius:0 4px 4px 0;margin:0;';

        const arrowIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        arrowIcon.setAttribute('width', '16');
        arrowIcon.setAttribute('height', '16');
        arrowIcon.setAttribute('viewBox', '0 0 24 24');
        arrowIcon.setAttribute('fill', 'currentColor');
        arrowIcon.style.cssText = 'display:block;';
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z');
        arrowIcon.appendChild(arrowPath);
        dropdownBtn.appendChild(arrowIcon);

        mainBtn.onmouseenter = () => { mainBtn.style.background = hoverColor; };
        mainBtn.onmouseleave = () => { mainBtn.style.background = baseColor; };
        dropdownBtn.onmouseenter = () => { dropdownBtn.style.background = hoverColor; };
        dropdownBtn.onmouseleave = () => { dropdownBtn.style.background = baseColor; };

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
                console.error('MAL Search: Error loading settings:', error);
                const fallbackSettings = normalizeSettings({});
                const fallbackEngine = getSelectedEngine(fallbackSettings);
                const query = buildQuery(title, year, 'titleYear', 'watch');
                window.open(buildUrl(fallbackEngine.url, query, fallbackSettings, 'titleYear'), '_blank');
            }
        };

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
        if (document.querySelector('#mal-search-btn')) return;
        const btn = createButton();

        const favSection = document.querySelector('#profileRows.pt0') ||
                          document.querySelector('#profileRows');
        if (favSection) {
            favSection.appendChild(btn);
            return;
        }

        const leftside = document.querySelector('.leftside');
        if (leftside) {
            const infoHeader = leftside.querySelector('h2');
            if (infoHeader) {
                leftside.insertBefore(btn, infoHeader);
            } else {
                leftside.appendChild(btn);
            }
        }
    }

    function createMenuLink(item) {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;align-items:center;padding:0 24px;transition:background 0.2s;';
        container.onmouseenter = () => { container.style.background = isDarkMode() ? '#353535' : '#f0f0f0'; };
        container.onmouseleave = () => { container.style.background = 'transparent'; };

        const link = document.createElement('a');
        link.href = '#';
        link.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px 0;color:${isDarkMode() ? '#cacaca' : '#323232'};text-decoration:none;cursor:pointer;font-size:14px;font-family:Verdana,Arial;flex:1;min-width:0;`;
        if (item.iconUrl) {
            const icon = document.createElement('img');
            icon.src = item.iconUrl;
            icon.alt = '';
            icon.referrerPolicy = 'no-referrer';
            icon.style.cssText = 'width:18px;height:18px;border-radius:4px;flex-shrink:0;background:rgba(0,0,0,0.05);';
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

        function createIconBtn(svgPath, title, url) {
            if (!url) return null;
            const btn = document.createElement('button');
            btn.title = title;
            const iconBtnStyle = isDarkMode()
                ? 'width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);cursor:pointer;color:#999;display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.15s;'
                : 'width:26px;height:26px;border-radius:50%;border:1px solid rgba(0,0,0,0.15);background:rgba(0,0,0,0.03);cursor:pointer;color:#666;display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.15s;';
            btn.style.cssText = iconBtnStyle;
            btn.onmouseenter = () => { btn.style.background = isDarkMode() ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'; btn.style.color = isDarkMode() ? '#fff' : '#333'; };
            btn.onmouseleave = () => { btn.style.background = isDarkMode() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; btn.style.color = isDarkMode() ? '#999' : '#666'; };
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

        const titleBtn = createIconBtn('M5 4h14v3h-5.5v13h-3V7H5V4z', 'Search by title only', item.urlTitle);
        if (titleBtn) btnGroup.appendChild(titleBtn);

        const yearBtn = createIconBtn('M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', 'Search by title and year', item.urlTitleYear);
        if (yearBtn) btnGroup.appendChild(yearBtn);

        container.appendChild(link);
        container.appendChild(btnGroup);
        return container;
    }

    async function getMenuItems(title, year) {
        try {
            const settings = normalizeSettings(await browser.storage.local.get(null));
            const items = [];
            settings.menuItems.forEach((item) => {
                const mode = item.usesSelectedEngine && item.queryMode === 'configured' ? settings.searchQueryMode : item.queryMode;
                const suffix = item.usesSelectedEngine && item.queryMode === 'configured' ? settings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                const titleQuery = buildQuery(title, year, 'title', '');
                const titleYearQuery = buildQuery(title, year, 'titleYear', '');
                items.push({
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    urlTitle: buildUrl(item.url, titleQuery, settings, item.queryMode),
                    urlTitleYear: buildUrl(item.url, titleYearQuery, settings, item.queryMode),
                    iconUrl: item.iconUrl || getFaviconUrl(item.url, settings)
                });
            });
            if (settings.customEngines.length > 0 && items.length > 0) {
                items.push({ isDivider: true });
            }
            settings.customEngines.forEach((item) => {
                const query = buildQuery(title, year, item.queryMode, '');
                const titleQuery = buildQuery(title, year, 'title', '');
                const titleYearQuery = buildQuery(title, year, 'titleYear', '');
                items.push({
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    urlTitle: buildUrl(item.url, titleQuery, settings, item.queryMode),
                    urlTitleYear: buildUrl(item.url, titleYearQuery, settings, item.queryMode),
                    iconUrl: item.iconUrl || getFaviconUrl(item.url, settings)
                });
            });
            return items;
        } catch (error) {
            console.error('MAL Search: Error loading menu settings:', error);
            const settings = normalizeSettings({});
            return DEFAULT_MENU_ITEMS.map((item) => {
                const mode = item.queryMode === 'configured' ? settings.searchQueryMode : item.queryMode;
                const suffix = item.queryMode === 'configured' ? settings.suffix : '';
                const query = buildQuery(title, year, mode, suffix);
                const titleQuery = buildQuery(title, year, 'title', '');
                const titleYearQuery = buildQuery(title, year, 'titleYear', '');
                return {
                    text: item.name,
                    url: buildUrl(item.url, query, settings, item.queryMode),
                    urlTitle: buildUrl(item.url, titleQuery, settings, item.queryMode),
                    urlTitleYear: buildUrl(item.url, titleYearQuery, settings, item.queryMode),
                    iconUrl: getFaviconUrl(item.url, settings)
                };
            });
        }
    }

    function createModal(title, year, posterUrl) {
        const dark = isDarkMode();
        const bgColor = dark ? '#121212' : '#fff';
        const textColor = dark ? '#cacaca' : '#323232';
        const borderColor = dark ? '#272727' : '#e5e5e5';
        const overlayBg = dark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)';
        const mutedColor = dark ? '#929292' : '#787878';

        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:${overlayBg};z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Verdana,Arial;`;

        const modal = document.createElement('div');
        modal.style.cssText = `background:${bgColor};border-radius:4px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid ${borderColor};color:${textColor};font-family:Verdana,Arial;`;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `position:absolute;top:12px;right:12px;background:${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:${dark ? '#fff' : '#666'};font-size:18px;line-height:1;z-index:10;display:flex;align-items:center;justify-content:center;transition:background 0.2s;`;
        closeBtn.onmouseenter = () => { closeBtn.style.background = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'; };
        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

        const header = document.createElement('div');
        header.style.cssText = `padding:24px 24px 16px;border-bottom:1px solid ${borderColor};display:flex;gap:16px;align-items:flex-start;`;
        if (posterUrl) {
            const posterImg = document.createElement('img');
            posterImg.src = posterUrl;
            posterImg.alt = title;
            posterImg.style.cssText = 'width:80px;height:120px;object-fit:cover;border-radius:4px;flex-shrink:0;background:#f0f0f0;';
            posterImg.onerror = () => { posterImg.style.display = 'none'; };
            header.appendChild(posterImg);
        }

        const headerText = document.createElement('div');
        headerText.style.flex = '1';
        const h3 = document.createElement('h3');
        h3.style.cssText = `margin:0 0 8px 0;color:${textColor};font-size:20px;font-weight:700;`;
        h3.textContent = 'Quick Search';
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `color:${mutedColor};font-size:14px;`;
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
                    divider.style.cssText = `border-top:1px solid ${borderColor};margin:0;width:100%;`;
                    listContainer.appendChild(divider);
                    return;
                }
                listContainer.appendChild(createMenuLink(item));
                if (index < items.length - 1 && !items[index + 1]?.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = `border-top:1px solid ${borderColor};margin:0;width:100%;`;
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
        '#profileRows.pt0',
        '#profileRows',
        '#v-favorite',
        '.js-favorite-button',
        'a.js-favorite-button'
    ];

    function tryAddButton() {
        for (const selector of selectors) {
            if (document.querySelector(selector)) {
                addButton();
                return true;
            }
        }
        const leftside = document.querySelector('.leftside');
        if (leftside) {
            addButton();
            return true;
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
                if (!document.querySelector('#mal-search-btn')) {
                    tryAddButton();
                }
            }, 500);
        };
    }
})();
