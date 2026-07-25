window.__RERESHARED__ = (function () {
    'use strict';

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
            targetUrl = selectedEngine?.url || 'https://www.google.com/search?q={query}';
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

    async function _jikanSearchCached(title, cache) {
        if (cache[title]) return cache[title];
        const url = await jikanSearchAnime(title);
        cache[title] = url;
        return url;
    }

    function buildImdbSearchUrl(title, year) {
        if (year) {
            const y = parseInt(year, 10);
            if (!isNaN(y)) {
                return `https://www.imdb.com/search/title/?title=${encodeURIComponent(title)}&release_date=${y}-01-01,${y}-12-31&adult=include`;
            }
        }
        return `https://www.imdb.com/search/title/?title=${encodeURIComponent(title)}&adult=include`;
    }

    async function imdbSearchTitle(title, year) {
        const searchUrl = buildImdbSearchUrl(title, year);
        try {
            const firstLetter = encodeURIComponent(title.charAt(0).toLowerCase());
            const json = await browser.runtime.sendMessage({
                type: "apiFetch",
                url: `https://v3.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(title)}.json`
            });
            if (json && json.d && json.d.length > 0 && json.d[0].id) {
                const apiYear = json.d[0].y;
                if (!year || (apiYear && Math.abs(apiYear - year) <= 1)) {
                    return `https://www.imdb.com/title/${json.d[0].id}/`;
                }
            }
        } catch {}
        return searchUrl;
    }

    async function _imdbSearchCached(title, year, cache) {
        if (cache[title]) return cache[title];
        const url = await imdbSearchTitle(title, year);
        cache[title] = url;
        return url;
    }

    function createIconBtn(svgPath, title, url, theme) {
        if (!url) return null;
        const t = theme || {};
        const btn = document.createElement('button');
        btn.className = 'rere-icon-btn';
        btn.title = title;
        const computed = getComputedStyle(document.createElement('div'));
        btn.style.cssText = t.iconBtnStyle || '';
        if (!t.iconBtnStyle) {
            t.iconBtnNormalBg = t.iconBtnNormalBg || 'rgba(255,255,255,0.05)';
            t.iconBtnHoverBg = t.iconBtnHoverBg || 'rgba(255,255,255,0.15)';
            t.iconBtnNormalColor = t.iconBtnNormalColor || '#999';
            t.iconBtnHoverColor = t.iconBtnHoverColor || '#fff';
            btn.style.cssText = 'width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:' + t.iconBtnNormalBg + ';cursor:pointer;color:' + t.iconBtnNormalColor + ';display:flex;align-items:center;justify-content:center;padding:0;transition:all 0.15s;';
        }
        btn.onmouseenter = () => { btn.style.background = t.iconBtnHoverBg; btn.style.color = t.iconBtnHoverColor; };
        btn.onmouseleave = () => { btn.style.background = t.iconBtnNormalBg; btn.style.color = t.iconBtnNormalColor; };
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '13');
        svg.setAttribute('height', '13');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', svgPath);
        svg.appendChild(path);
        btn.appendChild(svg);
        return btn;
    }

    function createMenuLink(item, closeMenuFn, theme) {
        const t = theme || {};
        const container = document.createElement('div');
        container.className = 'rere-menu-item';
        container.style.cssText = 'display:flex;align-items:center;padding:0 24px;transition:background 0.2s;';
        container.onmouseenter = () => { container.style.background = t.menuHoverBg || '#333'; };
        container.onmouseleave = () => { container.style.background = 'transparent'; };

        const link = document.createElement('a');
        link.href = '#';
        link.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 0;color:' + (t.linkColor || '#fff') + ';text-decoration:none;cursor:pointer;font-size:14px;font-family:' + (t.fontFamily || '-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif') + ';flex:1;min-width:0;';
        if (item.iconUrl) {
            const icon = document.createElement('img');
            icon.src = item.iconUrl;
            icon.alt = '';
            icon.referrerPolicy = 'no-referrer';
            icon.className = 'rere-menu-icon';
            icon.style.cssText = 'width:18px;height:18px;border-radius:4px;flex-shrink:0;background:' + (t.iconBg || 'rgba(255,255,255,0.08)') + ';';
            icon.onerror = () => { icon.style.display = 'none'; };
            link.appendChild(icon);
        }
        const text = document.createElement('span');
        text.textContent = item.text;
        link.appendChild(text);
        link.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMenuFn();
            window.open(item.url, '_blank');
        };

        const btnGroup = document.createElement('div');
        btnGroup.className = 'rere-menu-actions';
        btnGroup.style.cssText = 'display:flex;gap:4px;flex-shrink:0;margin-left:auto;padding-left:12px;';

        const iconBtns = [];
        if (item.malApiUrl) {
            iconBtns.push({ svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', title: 'Open on MyAnimeList (API)', url: item.malApiUrl });
        }
        if (item.imdbApiUrl) {
            iconBtns.push({ svgPath: 'M18 4v1h-2V4H8v1H6V4H4v16h2v-1h2v1h8v-1h2v1h2V4h-2zM8 15H6v-2h2v2zm0-4H6V9h2v2zm10 4h-2v-2h2v2zm0-4h-2V9h2v2z', title: 'Open on IMDb (API)', url: item.imdbApiUrl });
        }
        iconBtns.push({ svgPath: 'M5 4h14v3h-5.5v13h-3V7H5V4z', title: 'Search by title only', url: item.urlTitle });
        iconBtns.push({ svgPath: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', title: 'Search by title and year', url: item.urlTitleYear });

        for (const ib of iconBtns) {
            const btn = createIconBtn(ib.svgPath, ib.title, ib.url, t);
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    closeMenuFn();
                    window.open(ib.url, '_blank');
                };
                btnGroup.appendChild(btn);
            }
        }

        container.appendChild(link);
        container.appendChild(btnGroup);
        return container;
    }

    function getMenuItems(title, year, overrideProfileId, settings, apiConfig) {
        const apiField = apiConfig?.apiField || 'malApiMode';
        const apiSearchFn = apiConfig?.searchFn || _jikanSearchCached;
        const malQuickLink = apiConfig?.malQuickLink !== false;
        const isApiUrl = apiConfig?.isApiUrl || ((url) => (url || '').toLowerCase().includes('myanimelist.net'));

        const items = [];
        const apiTasks = [];
        const apiCache = {};
        let hasApiItem = false;

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

            const shouldUseApi = isApiUrl(rawItem.url) && ['split', 'always'].includes(rawItem[apiField]);
            if (shouldUseApi) {
                const apiMode = rawItem[apiField];
                apiTasks.push(apiSearchFn(title, year, apiCache).then(url => {
                    if (url) {
                        hasApiItem = true;
                        if (apiMode === 'always') normalItem.url = url;
                        else if (apiField === 'malApiMode') normalItem.malApiUrl = url;
                        else normalItem.imdbApiUrl = url;
                    }
                }));
            }
        }

        for (const rawItem of settings.menuItems) processItem(rawItem);
        if (settings.customEngines.length > 0 && items.length > 0) items.push({ isDivider: true });
        for (const rawItem of settings.customEngines) processItem(rawItem);

        if (malQuickLink && apiField === 'malApiMode') {
            apiTasks.push(_jikanSearchCached(title, apiCache).then(url => {
                if (url && !hasApiItem) {
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
    }

    function normalizeSettingsCommon(data, getProfileIdForHost, defaults, extraFields) {
        const DEFAULT_SEARCH_ENGINES = defaults?.searchEngines || [
            { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={query}', builtIn: true },
            { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={query}', builtIn: true },
            { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={query}', builtIn: true }
        ];
        const DEFAULT_MENU_ITEMS = defaults?.menuItems || [];

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
            const profileId = getProfileIdForHost();
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

        const result = {
            suffix,
            searchEngineId,
            searchQueryMode,
            searchEngines,
            menuItems,
            customEngines
        };

        if (extraFields) {
            Object.assign(result, extraFields(data));
        }

        return result;
    }

    function populateProfileSelect(profileSelect, profiles, currentProfileId, storageGetFn, renderMenuItemsFn) {
        storageGetFn(null).then((data) => {
            const allIds = Object.keys(profiles || data.profiles || {});
            const targetProfiles = profiles || data.profiles || {};
            if (!allIds.includes(currentProfileId)) {
                allIds.push(currentProfileId);
            }
            if (allIds.length > 0) {
                allIds.forEach((id) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = targetProfiles[id]?.name || id;
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
            if (renderMenuItemsFn) renderMenuItemsFn(profileSelect.value);
        });
    }

    function createModalStructure(title, year, posterUrl, theme) {
        const t = theme || {};
        const overlay = document.createElement('div');
        overlay.className = 'rere-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:' + (t.overlayBg || 'rgba(0,0,0,0.85)') + ';z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;font-family:' + (t.fontFamily || '-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif') + ';';

        const modal = document.createElement('div');
        modal.className = 'rere-modal';
        modal.style.cssText = 'background:' + (t.bgColor || '#1a1a1a') + ';border-radius:8px;max-width:640px;width:100%;max-height:90vh;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.6);border:1px solid ' + (t.borderColor || '#333') + ';display:flex;overflow:hidden;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.className = 'rere-modal-close';
        closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;background:' + (t.closeBg || 'rgba(255,255,255,0.1)') + ';border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:' + (t.closeColor || '#fff') + ';font-size:18px;line-height:1;z-index:10;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';
        const closeHoverBg = t.closeHoverBg || 'rgba(255,255,255,0.2)';
        closeBtn.onmouseenter = () => { closeBtn.style.background = closeHoverBg; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = t.closeBg || 'rgba(255,255,255,0.1)'; };

        const leftPanel = document.createElement('div');
        leftPanel.className = 'rere-modal-left';
        leftPanel.style.cssText = 'width:220px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:20px 0 20px 20px;';

        const coverContainer = document.createElement('div');
        coverContainer.className = 'rere-cover';
        coverContainer.style.cssText = 'width:200px;position:relative;border-radius:6px;overflow:hidden;cursor:pointer;transform-style:preserve-3d;transition:transform 0.1s ease-out;';
        coverContainer.style.perspective = '600px';

        const coverImg = document.createElement('img');
        coverImg.className = 'rere-cover-img';
        if (posterUrl) {
            coverImg.src = posterUrl;
        } else {
            coverImg.style.display = 'none';
        }
        coverImg.alt = title;
        coverImg.style.cssText = 'display:block;width:100%;height:auto;border-radius:6px;background:' + (t.coverBg || '#2a2a2a') + ';';
        coverImg.onerror = () => { coverImg.style.display = 'none'; };
        coverContainer.appendChild(coverImg);

        const glare = document.createElement('div');
        glare.className = 'rere-cover-glare';
        glare.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;border-radius:6px;pointer-events:none;transition:background 0.1s ease-out;';
        coverContainer.appendChild(glare);

        const shine = document.createElement('div');
        shine.className = 'rere-cover-shine';
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
            coverContainer.style.transform = 'perspective(600px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale3d(1.03,1.03,1.03)';
            const glareX = x * 100;
            const glareY = y * 100;
            glare.style.background = 'radial-gradient(circle at ' + glareX + '% ' + glareY + '%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)';
        });

        coverContainer.addEventListener('mouseleave', () => {
            coverContainer.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
            glare.style.background = 'transparent';
        });

        leftPanel.appendChild(coverContainer);

        const profileSelect = document.createElement('select');
        profileSelect.className = 'rere-profile-select';
        profileSelect.style.cssText = 'margin-top:14px;width:200px;font-size:12px;padding:2px 6px;border-radius:3px;border:1px solid ' + (t.borderColor || '#333') + ';background:' + (t.bgColor || '#1a1a1a') + ';color:' + (t.textColor || '#fff') + ';cursor:pointer;outline:none;';
        leftPanel.appendChild(profileSelect);

        const rightPanel = document.createElement('div');
        rightPanel.className = 'rere-modal-right';
        rightPanel.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;';

        const header = document.createElement('div');
        header.className = 'rere-modal-header';
        header.style.cssText = 'padding:20px 48px 14px 24px;border-bottom:1px solid ' + (t.borderColor || '#333') + ';';

        return { overlay, modal, closeBtn, leftPanel, coverContainer, coverImg, glare, shine, profileSelect, rightPanel, header };
    }

    return {
        ensureQueryPlaceholder,
        normalizeQueryMode,
        normalizeSearchEngine,
        normalizeMenuItem,
        normalizeCustomEngine,
        getSelectedEngine,
        buildQuery,
        buildUrl,
        extractTargetDomainFromQuery,
        getFaviconUrl,
        jikanSearchAnime,
        _jikanSearchCached,
        imdbSearchTitle,
        _imdbSearchCached,
        createIconBtn,
        createMenuLink,
        getMenuItems,
        normalizeSettingsCommon,
        populateProfileSelect,
        createModalStructure
    };
})();
