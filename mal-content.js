(function () {
    'use strict';

    const R = window.__RERESHARED__;

    const DEFAULT_MENU_ITEMS = [
        { id: 'menu_search', name: 'Search in new tab', url: '__DEFAULT_ENGINE__', queryMode: 'titleYear', usesSelectedEngine: true, builtIn: true },
        { id: 'menu_youtube', name: 'Search YouTube', url: 'https://www.youtube.com/results?search_query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_imdb', name: 'Search IMDb', url: 'https://www.imdb.com/find/?q={query}', queryMode: 'titleYear', builtIn: true, imdbApiMode: 'none' },
        { id: 'menu_archive', name: 'Search Archive.org', url: 'https://archive.org/search?tab=all&query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_rutracker', name: 'Search RuTracker', url: 'https://rutracker.org/forum/tracker.php?nm={query}', queryMode: 'title', builtIn: true }
    ];

    function isDarkMode() {
        return document.documentElement.classList.contains('dark-mode');
    }

    function getTitleAndYear() {
        let title = '';
        const titleEl = document.querySelector('h1.title-name strong') ||
                        document.querySelector('h1.h1_bold_none strong') ||
                        document.querySelector('h1.title-name') ||
                        document.querySelector('[itemprop="name"]') ||
                        document.querySelector('h1 span[itemprop="name"]');
        if (titleEl) {
            title = titleEl.innerText.replace(/\s*\(TV.*?\)\s*$/, '').replace(/\s*\(Movie\)\s*$/, '').replace(/\s*\(\w+ \d{4}\)\s*$/, '').trim();
        }
        let englishTitle = '';
        const englishEl = document.querySelector('p.title-english.title-inherit') ||
                          document.querySelector('.title-english') ||
                          document.querySelector('span[itemprop="alternateName"]') ||
                          document.querySelector('[property="og:title"]');
        if (englishEl) {
            englishTitle = englishEl.innerText.trim();
        }
        if (!englishTitle) {
            const altTitles = document.querySelector('.js-alternative-titles');
            if (altTitles) {
                const rows = altTitles.querySelectorAll('.title');
                for (const row of rows) {
                    const label = row.querySelector('span');
                    if (label && /english/i.test(label.textContent)) {
                        const txt = row.textContent.replace(label.textContent, '').trim();
                        if (txt) { englishTitle = txt; break; }
                    }
                }
            }
        }
        if (!englishTitle) {
            const script = document.querySelector('script[type="application/ld+json"]');
            if (script) {
                try {
                    const json = JSON.parse(script.textContent);
                    const alt = json?.alternativeHeadline || json?.alternateName;
                    if (alt) englishTitle = alt;
                } catch (e) {}
            }
        }
        console.log('rere MAL debug: title=' + title + ' englishTitle="' + englishTitle + '"');
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
                if (dt) {
                    const label = dt.textContent.trim();
                    if (label === 'Aired:' || label === 'Published:') {
                        const match = pad.textContent.match(/\b(19|20)\d{2}\b/);
                        if (match) { year = match[0]; break; }
                    }
                }
            }
        }
        return { title, year, englishTitle };
    }

    function getPosterUrl() {
        const img = document.querySelector('img[itemprop="image"]');
        if (img && img.src) {
            return img.src.replace(/\/r\/\d+x\d+/, '');
        }
        return '';
    }

    function getProfileIdForHost() {
        const path = window.location.pathname;
        if (path.startsWith('/anime/')) return 'mal-anime';
        if (path.startsWith('/manga/')) return 'mal-manga';
        return 'mal-anime';
    }

    function normalizeSettings(data, overrideProfileId) {
        const res = R.normalizeSettingsCommon(data, () => overrideProfileId || getProfileIdForHost(), {
            menuItems: DEFAULT_MENU_ITEMS
        }, (d) => ({
            searchTitleMode: d.searchTitleMode === 'english' ? 'english' : 'original'
        }));
        return res;
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
        txt.textContent = 'rer\u00e9: search';
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

        function getSiteForCurrentPage() {
            const path = window.location.pathname;
            if (path.startsWith('/anime/')) return 'mal-anime';
            if (path.startsWith('/manga/')) return 'mal-manga';
            return null;
        }

        mainBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { title, year, englishTitle } = getTitleAndYear();
            try {
                const data = await storageGet(null);
                const profiles = data.profiles || {};
                const hasAnySite = Object.values(profiles).some(p => p.site && p.site !== "\u2014");
                const currentSite = getSiteForCurrentPage();
                const matchingEntry = currentSite ? Object.entries(profiles).find(([, p]) => p.site === currentSite) : null;
                if (!hasAnySite || !matchingEntry) {
                    if (currentModal) { closeMenu(); return; }
                    currentModal = createModal(title, year, getPosterUrl(), englishTitle);
                    document.body.appendChild(currentModal);
                    document.body.style.overflow = 'hidden';
                    return;
                }
                const settings = normalizeSettings(data, matchingEntry[0]);
                const selectedEngine = R.getSelectedEngine(settings);
                const effectiveTitle = settings.searchTitleMode === 'english' && englishTitle ? englishTitle : title;
                const query = R.buildQuery(effectiveTitle, year, settings.searchQueryMode, settings.suffix);
                window.open(R.buildUrl(selectedEngine.url, query, effectiveTitle, year, settings, settings.searchQueryMode), '_blank');
            } catch (error) {
                console.error('MAL Search: Error loading settings:', error);
                if (currentModal) { closeMenu(); return; }
                currentModal = createModal(title, year, getPosterUrl(), englishTitle);
                document.body.appendChild(currentModal);
                document.body.style.overflow = 'hidden';
            }
        };

        dropdownBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentModal) { closeMenu(); return; }
            const { title, year, englishTitle } = getTitleAndYear();
            currentModal = createModal(title, year, getPosterUrl(), englishTitle);
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
        storageGet(["malEnabled", "malButtonLabel"]).then(data => {
            if (data.malEnabled === false) { btn.remove(); return; }
            const span = btn.querySelector('span');
            if (span) span.textContent = data.malButtonLabel === "search" ? "Search" : "rer\u00e9: search";
        });

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

    function createModal(title, year, posterUrl, englishTitle) {
        const dark = isDarkMode();
        const t = {
            dark,
            overlayBg: dark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
            bgColor: dark ? '#121212' : '#fff',
            textColor: dark ? '#cacaca' : '#323232',
            borderColor: dark ? '#272727' : '#e5e5e5',
            mutedColor: dark ? '#929292' : '#787878',
            fontFamily: 'Verdana,Arial',
            linkColor: dark ? '#cacaca' : '#323232',
            menuHoverBg: dark ? '#353535' : '#f0f0f0',
            iconBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            coverBg: dark ? '#2a2a2a' : '#f0f0f0',
            closeBg: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            closeHoverBg: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
            closeColor: dark ? '#fff' : '#666',
            iconBtnNormalBg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            iconBtnHoverBg: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            iconBtnNormalColor: dark ? '#999' : '#666',
            iconBtnHoverColor: dark ? '#fff' : '#333'
        };

        const structure = R.createModalStructure(title, year, posterUrl, t);
        const { overlay, modal, closeBtn, profileSelect, rightPanel, header } = structure;

        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

        const h3 = document.createElement('h3');
        h3.style.cssText = 'margin:0 0 6px 0;color:' + t.textColor + ';font-size:20px;font-weight:700;';
        h3.textContent = 'Quick rer\u00e9:Search';
        header.appendChild(h3);

        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'color:' + t.mutedColor + ';font-size:14px;';
        titleDiv.textContent = year ? `${title} (${year})` : title;
        header.appendChild(titleDiv);

        let usingEnglish = false;
        const titleToggleRow = document.createElement('div');
        titleToggleRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
        const origBtn = document.createElement('button');
        origBtn.textContent = 'Original';
        origBtn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:3px;border:1px solid ' + t.borderColor + ';cursor:pointer;background:' + t.mutedColor + ';color:' + t.bgColor + ';font-weight:600;';
        const engBtn = document.createElement('button');
        engBtn.textContent = 'English';
        engBtn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:3px;border:1px solid ' + t.borderColor + ';cursor:pointer;background:transparent;color:' + t.mutedColor + ';';
        function updateTitleDisplay(t) {
            titleDiv.textContent = year ? `${t} (${year})` : t;
        }
        function switchTitle(useEng) {
            usingEnglish = useEng;
            const active = useEng && englishTitle;
            origBtn.style.background = active ? 'transparent' : t.mutedColor;
            origBtn.style.color = active ? t.mutedColor : t.bgColor;
            engBtn.style.background = active ? t.mutedColor : 'transparent';
            engBtn.style.color = active ? t.bgColor : t.mutedColor;
            const ti = active ? englishTitle : title;
            updateTitleDisplay(ti);
            renderMenuItems(profileSelect.value, ti);
        }
        origBtn.onclick = () => { if (usingEnglish) switchTitle(false); };
        engBtn.onclick = () => { if (!usingEnglish && englishTitle) switchTitle(true); };
        if (englishTitle) {
            titleToggleRow.appendChild(origBtn);
            titleToggleRow.appendChild(engBtn);
            header.appendChild(titleToggleRow);
        }

        const listContainer = document.createElement('div');
        listContainer.style.padding = '8px 0';

        function renderItemList(items) {
            listContainer.innerHTML = '';
            items.forEach((item, index) => {
                if (item.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top:1px solid ' + t.borderColor + ';margin:0;width:100%;';
                    listContainer.appendChild(divider);
                    return;
                }
                listContainer.appendChild(R.createMenuLink(item, closeMenu, t));
                if (index < items.length - 1 && !items[index + 1]?.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top:1px solid ' + t.borderColor + ';margin:0;width:100%;';
                    listContainer.appendChild(divider);
                }
            });
        }

        async function renderMenuItems(profileId, activeTitle) {
            const ti = activeTitle || title;
            listContainer.innerHTML = '';
            try {
                const data = await storageGet(null);
                const settings = normalizeSettings(data, profileId);
                const apiConfig = {
                    apiField: 'imdbApiMode',
                    searchFn: R._imdbSearchCached,
                    malQuickLink: false,
                    isApiUrl: (url) => (url || '').toLowerCase().includes('imdb.com')
                };
                const { items, resolve } = R.getMenuItems(ti, year, profileId, settings, apiConfig);
                renderItemList(items);
                resolve().then(updated => { renderItemList(updated); });
            } catch (error) {
                console.error('Error loading menu settings:', error);
                const fallbackSettings = normalizeSettings({}, profileId);
                const fallback = R.getMenuItems(ti, year, profileId, fallbackSettings, { apiField: 'imdbApiMode', searchFn: R._imdbSearchCached });
                renderItemList(fallback.items);
            }
        }

        R.populateProfileSelect(profileSelect, null, getProfileIdForHost(), storageGet, (profileId) => {
            renderMenuItems(profileId, usingEnglish && englishTitle ? englishTitle : title);
        });

        profileSelect.addEventListener('change', () => {
            renderMenuItems(profileSelect.value, usingEnglish && englishTitle ? englishTitle : title);
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
        '#profileRows.pt0',
        '#profileRows',
        '#v-favorite',
        '.js-favorite-button',
        'a.js-favorite-button',
        '.information.anime',
        '.information.manga',
        '.js-anime-edit-info-button',
        'button[data-edit-button]'
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
        setTimeout(() => observer.disconnect(), 15000);
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

    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === "quickSearch") {
            (async () => {
                try {
                    const { title, year, englishTitle } = getTitleAndYear();
                    const data = await storageGet(null);
                    const currentSite = getSiteForCurrentPage();
                    const matchingEntry = currentSite ? Object.entries(data.profiles || {}).find(([, p]) => p.site === currentSite) : null;
                    if (matchingEntry) {
                        const settings = normalizeSettings(data, matchingEntry[0]);
                        const selectedEngine = R.getSelectedEngine(settings);
                        const effectiveTitle = settings.searchTitleMode === 'english' && englishTitle ? englishTitle : title;
                        const query = R.buildQuery(effectiveTitle, year, settings.searchQueryMode, settings.suffix);
                        const url = R.buildUrl(selectedEngine.url, query, effectiveTitle, year, settings, settings.searchQueryMode);
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
            const { title, year, englishTitle } = getTitleAndYear();
            if (currentModal) { closeMenu(); return; }
            currentModal = createModal(title, year, getPosterUrl(), englishTitle);
            document.body.appendChild(currentModal);
            document.body.style.overflow = 'hidden';
        }
    });
})();
