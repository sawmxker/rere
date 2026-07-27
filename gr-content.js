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

    const BTN_FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Helvetica Neue",Arial,sans-serif';
    const BTN_RADIUS = '9999px';

    function lockScroll() {
        const scrollY = window.scrollY;
        document.body.dataset.rereScrollY = scrollY;
        document.body.style.overflow = 'hidden';
    }

    function unlockScroll() {
        const scrollY = parseInt(document.body.dataset.rereScrollY || '0');
        delete document.body.dataset.rereScrollY;
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
    }

    function getTitleAndYear() {
        let title = '';
        const titleEl = document.querySelector('h1[aria-label^="Book title:"]') ||
                        document.querySelector('h1');
        if (titleEl) {
            title = titleEl.getAttribute('aria-label')?.replace(/^Book title:\s*/,'') || titleEl.innerText || '';
            title = title.trim();
        }
        let originalTitle = '';
        const descItems = document.querySelectorAll('.DescListItem');
        for (const item of descItems) {
            const dt = item.querySelector('dt');
            if (dt && dt.textContent.trim() === 'Original title') {
                const dd = item.querySelector('dd');
                if (dd) originalTitle = dd.textContent.trim();
                break;
            }
        }
        let year = '';
        const pubInfo = document.querySelector('[data-testid="publicationInfo"]');
        if (pubInfo) {
            const match = pubInfo.innerText.match(/\b(19|20)\d{2}\b/);
            if (match) year = match[0];
        }
        return { title, originalTitle, year };
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
        }, (d) => ({
            searchTitleMode: d.searchTitleModeGR === 'original' ? 'original' : 'edition'
        }));
    }

    let currentModal = null;
    let escHandler = null;

    function closeMenu() {
        if (currentModal) {
            currentModal.remove();
            currentModal = null;
            unlockScroll();
        }
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
    }

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
            const { title, originalTitle, year } = getTitleAndYear();
            try {
                const data = await storageGet(null);
                ensureGoodreadsProfile(data);
                const profiles = data.profiles || {};
                const matchingEntry = Object.entries(profiles).find(([, p]) => p.site === "goodreads");
                if (!matchingEntry) {
                    if (currentModal) { closeMenu(); return; }
                    currentModal = createModal(title, originalTitle, year, getPosterUrl());
                    lockScroll();
                    document.body.appendChild(currentModal);
                    return;
                }
                const settings = normalizeSettings(data, matchingEntry[0]);
                const effectiveTitle = settings.searchTitleMode === 'original' && originalTitle ? originalTitle : title;
                const selectedEngine = R.getSelectedEngine(settings);
                const query = R.buildQuery(effectiveTitle, year, settings.searchQueryMode, settings.suffix);
                window.open(R.buildUrl(selectedEngine.url, query, effectiveTitle, year, settings, settings.searchQueryMode), '_blank');
            } catch (error) {
                console.error('GR Search: Error loading settings:', error);
                if (currentModal) { closeMenu(); return; }
                currentModal = createModal(title, originalTitle, year, getPosterUrl());
                lockScroll();
                document.body.appendChild(currentModal);
            }
        };

        dropdownBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentModal) { closeMenu(); return; }
            const { title, originalTitle, year } = getTitleAndYear();
            currentModal = createModal(title, originalTitle, year, getPosterUrl());
            lockScroll();
            document.body.appendChild(currentModal);
        };

        wrapper.appendChild(mainBtn);
        wrapper.appendChild(dropdownBtn);
        return wrapper;
    }

    function updateButtonBorder(color) {
        const wrapper = document.querySelector('#gr-search-btn');
        if (!wrapper) return;
        wrapper.querySelectorAll('a').forEach(a => {
            a.style.borderColor = color;
        });
    }

    function addButton() {
        if (document.querySelector('#gr-search-btn')) return;

        const btn = createButton();
        const actionDiv = document.createElement('div');
        actionDiv.id = 'gr-search-btn';
        actionDiv.style.cssText = 'width:100%;margin:2px 0 4px 0;';
        actionDiv.appendChild(btn);

        const leftColumn = document.querySelector('.BookPage__leftColumn');
        const ba = document.querySelector('.BookPage__leftColumn .BookActions') ||
                   document.querySelector('.BookActions');
        if (!leftColumn && !ba) return;

        const insertTarget = leftColumn || ba;

        storageGet(["grEnabled", "grSubtleBorder"]).then(data => {
            if (data.grEnabled === false) {
                const existing = document.querySelector('#gr-search-btn');
                if (existing) existing.remove();
                return;
            }
            if (data.grSubtleBorder === true) {
                updateButtonBorder('#dcdcdc');
            }
        });

        const wtr = ba ? ba.querySelector('[aria-label*="want to read"], [aria-label*="Want to Read"]') : null;
        if (wtr) {
            const parentAction = wtr.closest('.BookActions__button') || wtr.parentElement;
            if (parentAction && parentAction.parentNode === ba) {
                parentAction.after(actionDiv);
            } else {
                const firstAction = ba.querySelector(':scope > .BookActions__button');
                if (firstAction) firstAction.after(actionDiv);
                else insertTarget.prepend(actionDiv);
            }
        } else {
            const firstAction = ba ? ba.querySelector(':scope > .BookActions__button') : null;
            if (firstAction) firstAction.after(actionDiv);
            else insertTarget.prepend(actionDiv);
        }
    }

    function createModal(title, originalTitle, year, posterUrl) {
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

        let usingOriginal = false;
        const titleToggleRow = document.createElement('div');
        titleToggleRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edition';
        editBtn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:3px;border:1px solid ' + t.borderColor + ';cursor:pointer;background:' + t.mutedColor + ';color:' + t.bgColor + ';font-weight:600;';
        const origBtn = document.createElement('button');
        origBtn.textContent = 'Original';
        origBtn.style.cssText = 'font-size:11px;padding:1px 8px;border-radius:3px;border:1px solid ' + t.borderColor + ';cursor:pointer;background:transparent;color:' + t.mutedColor + ';';

        function updateTitleDisplay(ti) {
            titleDiv.textContent = year ? `${ti} (${year})` : ti;
        }

        function switchTitle(useOrig) {
            usingOriginal = useOrig;
            const active = useOrig && originalTitle;
            editBtn.style.background = active ? 'transparent' : t.mutedColor;
            editBtn.style.color = active ? t.mutedColor : t.bgColor;
            origBtn.style.background = active ? t.mutedColor : 'transparent';
            origBtn.style.color = active ? t.bgColor : t.mutedColor;
            const ti = active ? originalTitle : title;
            updateTitleDisplay(ti);
            renderMenuItems(profileSelect.value, ti);
        }

        editBtn.onclick = () => { if (usingOriginal) switchTitle(false); };
        origBtn.onclick = () => { if (!usingOriginal && originalTitle) switchTitle(true); };

        if (originalTitle) {
            titleToggleRow.appendChild(editBtn);
            titleToggleRow.appendChild(origBtn);
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
                ensureGoodreadsProfile(data);
                const settings = normalizeSettings(data, profileId);
                const apiConfig = {
                    apiField: 'malApiMode',
                    searchFn: R._jikanSearchCached,
                    malQuickLink: false,
                    isApiUrl: (url) => (url || '').toLowerCase().includes('myanimelist.net')
                };
                const { items, resolve } = R.getMenuItems(ti, year, profileId, settings, apiConfig);
                renderItemList(items);
                resolve().then(updated => { renderItemList(updated); });
            } catch (error) {
                console.error('Error loading menu settings:', error);
                const fallbackSettings = normalizeSettings({}, profileId);
                const fallback = R.getMenuItems(ti, year, profileId, fallbackSettings, { apiField: 'malApiMode', searchFn: R._jikanSearchCached });
                renderItemList(fallback.items);
            }
        }

        R.populateProfileSelect(profileSelect, null, 'goodreads', storageGet, (profileId) => {
            renderMenuItems(profileId, usingOriginal && originalTitle ? originalTitle : title);
        });

        profileSelect.addEventListener('change', () => {
            renderMenuItems(profileSelect.value, usingOriginal && originalTitle ? originalTitle : title);
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
        if (document.querySelector('#gr-search-btn')) return true;
        const leftColumn = document.querySelector('.BookPage__leftColumn');
        const ba = document.querySelector('.BookPage__leftColumn .BookActions') ||
                   document.querySelector('.BookActions');
        if (!leftColumn && !ba) return false;
        addButton();
        return true;
    }

    if (!tryAddButton()) {
        const observer = new MutationObserver(() => {
            if (tryAddButton()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 30000);
    }

    const reattachObserver = new MutationObserver(() => {
        if (!document.querySelector('#gr-search-btn') && document.querySelector('.BookPage__leftColumn, .BookActions')) {
            setTimeout(() => tryAddButton(), 50);
        }
    });
    reattachObserver.observe(document.body, { childList: true, subtree: true });

    if (window.history?.pushState) {
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            setTimeout(() => {
                if (!document.querySelector('#gr-search-btn')) {
                    tryAddButton();
                }
            }, 300);
        };
    }
})();
