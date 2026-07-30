(function () {
    'use strict';

    const R = window.__RERESHARED__;

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

    function getProfileIdForHost() {
        return 'imdb';
    }

    function normalizeSettings(data, overrideProfileId) {
        return R.normalizeSettingsCommon(data, () => overrideProfileId || getProfileIdForHost(), {
            searchEngines: DEFAULT_SEARCH_ENGINES,
            menuItems: DEFAULT_MENU_ITEMS
        }, (d) => ({
            malQuickLink: typeof d.malQuickLink === 'boolean' ? d.malQuickLink : true
        }));
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
                const selectedEngine = R.getSelectedEngine(settings);
                const query = R.buildQuery(title, year, settings.searchQueryMode, settings.suffix);
                window.open(R.buildUrl(selectedEngine.url, query, title, year, settings, settings.searchQueryMode), '_blank');
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
            if (currentModal) { closeMenu(); return; }
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
        const fallbackSelectors = [
            '[data-testid="tm-box-wl-button"]',
            '[data-testid="poster-watchlist-ribbon-add"]',
            '.ipc-watchlist-ribbon',
            'button[aria-label*="Watchlist"]',
            'button[aria-label*="watchlist"]',
            'button[aria-label*="add to watchlist"]',
            '.sc-dcb1530e-3',
            '.ipc-split-button.ipc-btn--theme-baseAlt',
            '[data-testid="hero-parent"] div:first-child > div:first-child'
        ];
        for (const sel of fallbackSelectors) {
            const el = document.querySelector(sel);
            if (el) {
                const container = el.closest('.sc-dcb1530e-3') || el.parentElement?.parentElement || el.parentElement;
                if (container && container !== document.body) {
                    container.insertBefore(btn, container.firstChild);
                    return;
                }
                const rightColumn = document.querySelector('[data-testid="hero-parent"] .sc-89427c75-12') ||
                    document.querySelector('.ipc-page-content-container--center > div:last-child');
                if (rightColumn) {
                    rightColumn.insertBefore(btn, rightColumn.firstChild);
                    return;
                }
            }
        }
        const rightColumn = document.querySelector('[data-testid="hero-parent"] .sc-89427c75-12') ||
            document.querySelector('.ipc-page-content-container--center > div:last-child');
        if (rightColumn) {
            rightColumn.insertBefore(btn, rightColumn.firstChild);
        }
    }

    function createModal(title, year, posterUrl) {
        const t = {
            overlayBg: 'rgba(0,0,0,0.85)',
            bgColor: '#1a1a1a',
            textColor: '#fff',
            borderColor: '#333',
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            linkColor: '#fff',
            menuHoverBg: '#333',
            iconBg: 'rgba(255,255,255,0.08)',
            iconBtnNormalBg: 'rgba(255,255,255,0.05)',
            iconBtnHoverBg: 'rgba(255,255,255,0.15)',
            iconBtnNormalColor: '#999',
            iconBtnHoverColor: '#fff'
        };

        const structure = R.createModalStructure(title, year, posterUrl, t);
        const { overlay, modal, closeBtn, profileSelect, rightPanel, header } = structure;

        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

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
                listContainer.appendChild(R.createMenuLink(item, closeMenu, t));
                if (index < items.length - 1 && !items[index + 1]?.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top:1px solid #333;margin:0;width:100%;';
                    listContainer.appendChild(divider);
                }
            });
        }

        async function renderMenuItems(profileId) {
            listContainer.innerHTML = '';
            try {
                const data = await storageGet(null);
                const settings = normalizeSettings(data, profileId);
                const apiConfig = {
                    apiField: 'malApiMode',
                    searchFn: R._jikanSearchCached,
                    malQuickLink: settings.malQuickLink,
                    isApiUrl: (url) => (url || '').toLowerCase().includes('myanimelist.net')
                };
                const { items, resolve } = R.getMenuItems(title, year, profileId, settings, apiConfig);
                renderItemList(items);
                resolve().then(updated => { renderItemList(updated); });
            } catch (error) {
                console.error('Error loading menu settings:', error);
                const fallbackSettings = normalizeSettings({}, profileId);
                const fallback = R.getMenuItems(title, year, profileId, fallbackSettings, { apiField: 'malApiMode', searchFn: R._jikanSearchCached });
                renderItemList(fallback.items);
            }
        }

        R.populateProfileSelect(profileSelect, null, getProfileIdForHost(), storageGet, renderMenuItems);

        profileSelect.addEventListener('change', () => {
            renderMenuItems(profileSelect.value);
        });

        rightPanel.appendChild(header);
        rightPanel.appendChild(listContainer);

        modal.appendChild(closeBtn);
        modal.appendChild(structure.leftPanel);
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
        'button[aria-label*="add to watchlist"]',
        'button[aria-label*="favorite"]',
        '.sc-dcb1530e-3',
        '.ipc-split-button.ipc-btn--theme-baseAlt',
        '[data-testid="hero-parent"] > div > div'
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
        setTimeout(() => observer.disconnect(), 15000);
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

    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === "quickSearch") {
            (async () => {
                try {
                    const { title, year } = getTitleAndYear();
                    const data = await storageGet(null);
                    const profiles = data.profiles || {};
                    const matchingEntry = Object.entries(profiles).find(([, p]) => p.site === "imdb");
                    if (matchingEntry) {
                        const settings = normalizeSettings(data, matchingEntry[0]);
                        const selectedEngine = R.getSelectedEngine(settings);
                        const query = R.buildQuery(title, year, settings.searchQueryMode, settings.suffix);
                        const url = R.buildUrl(selectedEngine.url, query, title, year, settings, settings.searchQueryMode);
                        sendResponse({ url });
                    } else {
                        sendResponse({ error: true });
                    }
                } catch (error) {
                    sendResponse({ error: true });
                }
            })();
            return true;
        }
        if (msg.type === "openModal") {
            const { title, year } = getTitleAndYear();
            if (currentModal) { closeMenu(); return; }
            currentModal = createModal(title, year, getPosterUrl());
            document.body.appendChild(currentModal);
            document.body.style.overflow = 'hidden';
        }
    });
})();
