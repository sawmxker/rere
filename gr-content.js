(function () {
    'use strict';

    const R = window.__RERESHARED__;

    const DEFAULT_MENU_ITEMS = [
        { id: 'menu_search', name: 'Search in new tab', url: '__DEFAULT_ENGINE__', queryMode: 'titleYear', usesSelectedEngine: true, builtIn: true },
        { id: 'menu_zlib', name: 'Search Z-Library', url: 'https://zlib.bz/s/{query}', queryMode: 'title', builtIn: true },
        { id: 'menu_mal', name: 'Search MyAnimeList', url: 'https://myanimelist.net/search/all?q={query}', queryMode: 'title', builtIn: true, malApiMode: 'none' },
        { id: 'menu_archive', name: 'Search Archive.org', url: 'https://archive.org/search?tab=all&query={query}', queryMode: 'title', builtIn: true },
        { id: 'menu_rutracker', name: 'Search RuTracker', url: 'https://rutracker.org/forum/tracker.php?nm={query}', queryMode: 'title', builtIn: true }
    ];

    const GOODREADS_THEME = {
        overlayBg: 'rgba(0,0,0,0.6)',
        bgColor: '#fff',
        textColor: '#333',
        borderColor: '#e0e0e0',
        mutedColor: '#888',
        fontFamily: 'Merriweather,Georgia,"Times New Roman",serif',
        linkColor: '#333',
        menuHoverBg: '#f5f0eb',
        iconBg: 'rgba(0,0,0,0.05)',
        coverBg: '#f5f0eb',
        closeBg: 'rgba(0,0,0,0.06)',
        closeHoverBg: 'rgba(0,0,0,0.12)',
        closeColor: '#666',
        iconBtnNormalBg: 'rgba(0,0,0,0.03)',
        iconBtnHoverBg: 'rgba(0,0,0,0.08)',
        iconBtnNormalColor: '#666',
        iconBtnHoverColor: '#333'
    };

    function getTitleAndYear() {
        let title = '';
        const titleEl = document.querySelector('h1[aria-label^="Book title:"]') ||
                        document.querySelector('h1');
        if (titleEl) {
            title = titleEl.getAttribute('aria-label')?.replace(/^Book title:\s*/,'') || titleEl.innerText || '';
            title = title.trim();
        }
        let year = '';
        const pubInfo = document.querySelector('[data-testid="publicationInfo"]');
        if (pubInfo) {
            const match = pubInfo.innerText.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        }
        return { title, year };
    }

    function getPosterUrl() {
        const img = document.querySelector('.BookCover__image img.ResponsiveImage');
        if (img && img.src && !img.src.includes('no-cover')) {
            return img.src;
        }
        return '';
    }

    function getProfileIdForHost() {
        return 'goodreads';
    }

    function ensureGoodreadsProfile(data) {
        if (!data.profiles) data.profiles = {};
        if (!data.profiles.goodreads) {
            data.profiles.goodreads = {
                id: 'goodreads', name: 'Goodreads', site: 'goodreads',
                suffix: 'read', searchQueryMode: 'titleYear',
                menuItems: DEFAULT_MENU_ITEMS.map(i => ({ ...i })),
                customEngines: []
            };
        }
    }

    function normalizeSettings(data, overrideProfileId) {
        return R.normalizeSettingsCommon(data, () => overrideProfileId || getProfileIdForHost(), {
            menuItems: DEFAULT_MENU_ITEMS
        }, null);
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

    const BTN_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Helvetica Neue",Arial,sans-serif';
        const BTN_RADIUS = '9999px';
    
        function createButton() {
                    const wrapper = document.createElement('div');
                    wrapper.id = 'gr-search-btn';
                    wrapper.style.cssText = 'display:flex;width:100%;margin-top:2px;box-sizing:border-box;';
            
                    const mainBtn = document.createElement('a');
                    mainBtn.href = '#';
                    mainBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1;min-height:40px;padding:8px 16px;font-size:14px;font-weight:600;font-family:' + BTN_FONT + ';color:#333;text-decoration:none;line-height:normal;cursor:pointer;box-sizing:border-box;background:#fff;border:2px solid #707070;border-right:none;border-radius:' + BTN_RADIUS + ' 0 0 ' + BTN_RADIUS + ';margin:0;transition:background 0.15s ease, border-color 0.15s ease;';
                    mainBtn.onmouseenter = () => { mainBtn.style.background = '#f5f5f5'; };
                    mainBtn.onmouseleave = () => { mainBtn.style.background = '#fff'; };
            
                    const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    searchIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    searchIcon.setAttribute('width', '18');
                    searchIcon.setAttribute('height', '18');
                    searchIcon.setAttribute('viewBox', '0 0 24 24');
                    searchIcon.setAttribute('fill', '#555');
                    searchIcon.style.cssText = 'display:block;flex-shrink:0;margin-right:2px;';
                    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    iconPath.setAttribute('d', 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l-.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z');
                    searchIcon.appendChild(iconPath);
                    mainBtn.appendChild(searchIcon);
            
                    const txt = document.createElement('span');
                    txt.textContent = 'rer\u00e9:Search';
                    mainBtn.appendChild(txt);
            
                    const dropdownBtn = document.createElement('a');
                    dropdownBtn.href = '#';
                    dropdownBtn.setAttribute('aria-label', 'More options');
                    dropdownBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 12px;min-width:36px;color:#333;text-decoration:none;line-height:1;cursor:pointer;box-sizing:border-box;background:#fff;border:2px solid #707070;border-radius:0 ' + BTN_RADIUS + ' ' + BTN_RADIUS + ' 0;margin:0;transition:background 0.15s ease, border-color 0.15s ease;';
                    dropdownBtn.onmouseenter = () => { dropdownBtn.style.background = '#f5f5f5'; };
                    dropdownBtn.onmouseleave = () => { dropdownBtn.style.background = '#fff'; };
            
                    const arrowIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    arrowIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    arrowIcon.setAttribute('width', '16');
                    arrowIcon.setAttribute('height', '16');
                    arrowIcon.setAttribute('viewBox', '0 0 24 24');
                    arrowIcon.setAttribute('fill', '#555');
                    arrowIcon.style.cssText = 'display:block;';
                    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    arrowPath.setAttribute('d', 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z');
                    arrowIcon.appendChild(arrowPath);
                    dropdownBtn.appendChild(arrowIcon);
            
                    mainBtn.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const { title, year } = getTitleAndYear();
                        try {
                            const data = await storageGet(null);
                            ensureGoodreadsProfile(data);
                            const profiles = data.profiles || {};
                            const matchingEntry = Object.entries(profiles).find(([, p]) => p.site === "goodreads");
                            if (!matchingEntry) {
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
                            console.error('GR Search: Error loading settings:', error);
                            if (currentModal) { closeMenu(); return; }
                            currentModal = createModal(title, year, getPosterUrl());
                            document.body.appendChild(currentModal);
                            document.body.style.overflow = 'hidden';
                        }
                    };
            
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
                    if (document.querySelector('#gr-search-btn')) return;
            
                    const btn = createButton();
            
                    storageGet(["grEnabled"]).then(data => {
                        if (data.grEnabled === false) { btn.remove(); return; }
                    });
            
                    const actionDiv = document.createElement('div');
                    actionDiv.style.cssText = 'width:100%;margin:2px 0 4px 0;';
                    actionDiv.appendChild(btn);
            
                    const ba = document.querySelector('.BookPage__leftColumn .BookActions') ||
                               document.querySelector('.BookActions');
                    if (!ba) return;
            
                    const wtr = ba.querySelector('[aria-label*="want to read"], [aria-label*="Want to Read"]');
                    if (wtr) {
                        const parentAction = wtr.closest('.BookActions__button') || wtr.parentElement;
                        if (parentAction && parentAction.parentNode === ba) {
                            parentAction.after(actionDiv);
                        } else {
                            const firstAction = ba.querySelector(':scope > .BookActions__button');
                            if (firstAction) firstAction.after(actionDiv);
                            else ba.prepend(actionDiv);
                        }
                    } else {
                        const firstAction = ba.querySelector(':scope > .BookActions__button');
                        if (firstAction) firstAction.after(actionDiv);
                        else ba.prepend(actionDiv);
                    }
                }

    function createModal(title, year, posterUrl) {
        const t = GOODREADS_THEME;

        const structure = R.createModalStructure(title, year, posterUrl, t);
        const { overlay, modal, closeBtn, profileSelect, rightPanel, header } = structure;

        closeBtn.onclick = (e) => { e.stopPropagation(); closeMenu(); };

        const h3 = document.createElement('h3');
        h3.style.cssText = 'margin:0 0 6px 0;color:' + t.textColor + ';font-size:20px;font-weight:700;font-family:Merriweather,Georgia,serif;';
        h3.textContent = 'Quick rer\u00e9:Search';
        header.appendChild(h3);

        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'color:' + t.mutedColor + ';font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        titleDiv.textContent = year ? `${title} (${year})` : title;
        header.appendChild(titleDiv);

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

        async function renderMenuItems(profileId) {
            listContainer.innerHTML = '';
            try {
                const data = await storageGet(null);
                ensureGoodreadsProfile(data);
                const settings = normalizeSettings(data, profileId);
                const apiConfig = {
                    apiField: 'malApiMode',
                    searchFn: R._jikanSearchCached,
                    malQuickLink: false,
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

        R.populateProfileSelect(profileSelect, null, 'goodreads', storageGet, (profileId) => {
            renderMenuItems(profileId);
        });

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

    function tryAddButton() {
        const ba = document.querySelector('.BookPage__leftColumn .BookActions') ||
                   document.querySelector('.BookActions');
        if (!ba) return false;
        if (ba.querySelector('[aria-label*="want to read"], [aria-label*="Want to Read"]') ||
            ba.querySelector(':scope > .BookActions__button')) {
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
                if (!document.querySelector('#gr-search-btn')) {
                    tryAddButton();
                }
            }, 500);
        };
    }
})();
