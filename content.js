(function () {
    'use strict';

    function waitForElement(selector, callback, timeout = 10000) {
        const el = document.querySelector(selector);
        if (el) return callback(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                callback(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => observer.disconnect(), timeout);
    }

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

    function buildSearchUrl(query, engine = 'google', customUrl = '') {
        const encodedQuery = encodeURIComponent(query.trim());
        
        if (engine === 'custom' && customUrl && customUrl.includes('{query}')) {
            return customUrl.replace('{query}', encodedQuery);
        }
        
        switch (engine) {
            case 'duckduckgo':
                return `https://duckduckgo.com/?q=${encodedQuery}`;
            case 'bing':
                return `https://www.bing.com/search?q=${encodedQuery}`;
            case 'yandex':
                return `https://yandex.ru/search/?text=${encodedQuery}`;
            default:
                return `https://www.google.com/search?q=${encodedQuery}`;
        }
    }

    function createButton() {
        const wrapper = document.createElement('div');
        wrapper.className = "ipc-split-button ipc-btn--theme-baseAlt ipc-split-button--ellide-false ipc-split-button--button-radius ipc-btn--core-accent1 ipc-split-button--width-full";
        wrapper.id = "imdb-search-btn";
        wrapper.style.marginBottom = "12px";

        const mainBtn = document.createElement('button');
        mainBtn.className = "ipc-split-button__btn ipc-split-button__btn--button-radius";
        mainBtn.setAttribute("type", "button");
        mainBtn.setAttribute("tabindex", "0");
        mainBtn.setAttribute("aria-disabled", "false");

        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        icon.setAttribute("width", "24");
        icon.setAttribute("height", "24");
        icon.setAttribute("class", "ipc-icon ipc-icon--search ipc-btn__icon ipc-btn__icon--pre");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "currentColor");
        icon.innerHTML = '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>';

        const textDiv = document.createElement('div');
        textDiv.className = "ipc-btn__text";
        textDiv.innerHTML = '<div>Search</div>';

        mainBtn.appendChild(icon);
        mainBtn.appendChild(textDiv);

        // ИСПРАВЛЕНО: Основная кнопка теперь правильно читает настройки
        mainBtn.onclick = async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const { title, year } = getTitleAndYear();
            const baseQuery = `${title} ${year}`.trim();

            try {
                const data = await browser.storage.local.get(["suffix", "engine", "customSearchUrl"]);
                const suffix = data.suffix || "watch";
                const engine = data.engine || "google";
                const customUrl = data.customSearchUrl || "";

                const searchQuery = suffix ? `${baseQuery} ${suffix}`.trim() : baseQuery;
                const url = buildSearchUrl(searchQuery, engine, customUrl);
                
                window.open(url, '_blank');
            } catch (err) {
                console.error('Error loading search settings:', err);
                const url = buildSearchUrl(baseQuery, 'google', '');
                window.open(url, '_blank');
            }
        };

        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = "ipc-split-button__iconBtn ipc-split-button__iconBtn--button-radius";
        dropdownBtn.setAttribute("type", "button");
        dropdownBtn.setAttribute("aria-label", "More options");
        dropdownBtn.setAttribute("tabindex", "0");
        dropdownBtn.setAttribute("aria-disabled", "false");

        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        arrow.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        arrow.setAttribute("width", "24");
        arrow.setAttribute("height", "24");
        arrow.setAttribute("class", "ipc-icon ipc-icon--arrow ipc-btn__icon");
        arrow.setAttribute("viewBox", "0 0 24 24");
        arrow.setAttribute("fill", "currentColor");
        arrow.innerHTML = `
            <path opacity=".87" fill="none" d="M24 24H0V0h24v24z"></path>
            <path d="M15.88 9.29L12 13.17 8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.39-.38-1.03-.39-1.42 0z"></path>
        `;

        dropdownBtn.appendChild(arrow);

        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (currentModal) {
                closeMenu();
                return;
            }

            const { title, year } = getTitleAndYear();
            const poster = getPosterUrl();
            currentModal = createModal(title, year, poster);
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

    function createModal(title, year, posterUrl) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1a1a1a;
            border-radius: 8px;
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            border: 1px solid #333;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            color: #fff;
            font-size: 18px;
            line-height: 1;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
        closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeMenu();
        };

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 24px 16px;
            border-bottom: 1px solid #333;
            display: flex;
            gap: 16px;
            align-items: flex-start;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        if (posterUrl) {
            const posterImg = document.createElement('img');
            posterImg.src = posterUrl;
            posterImg.alt = title;
            posterImg.style.cssText = `
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 4px;
                flex-shrink: 0;
                background: #2a2a2a;
            `;
            posterImg.onerror = () => {
                posterImg.style.display = 'none';
            };
            header.appendChild(posterImg);
        }

        const headerText = document.createElement('div');
        headerText.style.flex = '1';
        headerText.innerHTML = `
            <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 20px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Quick Search</h3>
            <div style="color: #aaa; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${year ? `${title} (${year})` : title}</div>
        `;
        header.appendChild(headerText);

        const listContainer = document.createElement('div');
        listContainer.style.padding = '8px 0';
        listContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const { title: cleanTitle, year: cleanYear } = getTitleAndYear();
        const baseQuery = `${cleanTitle} ${cleanYear}`.trim();
        
        const getMenuItems = async () => {
            try {
                const data = await browser.storage.local.get(["suffix", "engine", "customSearchUrl", "customEngines"]);
                const suffix = data.suffix || "watch";
                const engine = data.engine || "google";
                const customUrl = data.customSearchUrl || "";
                const customEngines = data.customEngines || [];

                const queryWithSuffix = suffix ? `${baseQuery} ${suffix}`.trim() : baseQuery;

                const items = [
                    { 
                        text: 'Search in new tab (info)', 
                        url: buildSearchUrl(queryWithSuffix, engine, customUrl),
                        isDynamic: true 
                    },
                    { 
                        text: 'Search in new tab (by title)', 
                        url: buildSearchUrl(cleanTitle, engine, customUrl),
                        isDynamic: true 
                    },
                    { text: 'Search YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search MyAnimeList', url: `https://myanimelist.net/search/all?q=${encodeURIComponent(baseQuery)}` },
                    { text: 'Search Archive.org', url: `https://archive.org/search?query=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search Animetosho', url: `https://animetosho.org/search?q=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search Torrents', url: `https://1337x.to/search/${encodeURIComponent(cleanTitle)}/1/` },
                    { text: 'Search RuTracker', url: `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(baseQuery)}` },
                ];

                if (Array.isArray(customEngines) && customEngines.length > 0) {
                    items.push({ isDivider: true });
                    customEngines.forEach((ce, idx) => {
                        if (ce.name && ce.url && ce.url.includes('{query}')) {
                            items.push({
                                text: ce.name,
                                url: ce.url.replace('{query}', encodeURIComponent(baseQuery)),
                                isCustom: true
                            });
                        }
                    });
                }

                return items;
            } catch (err) {
                console.error('Error loading menu settings:', err);
                return [
                    { text: 'Search in new tab (info)', url: buildSearchUrl(baseQuery, 'google', '') },
                    { text: 'Search in new tab (by title)', url: buildSearchUrl(cleanTitle, 'google', '') },
                    { text: 'Search YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search MyAnimeList', url: `https://myanimelist.net/search/all?q=${encodeURIComponent(baseQuery)}` },
                    { text: 'Search Archive.org', url: `https://archive.org/search?query=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search Animetosho', url: `https://animetosho.org/search?q=${encodeURIComponent(cleanTitle)}` },
                    { text: 'Search Torrents', url: `https://1337x.to/search/${encodeURIComponent(cleanTitle)}/1/` },
                    { text: 'Search RuTracker', url: `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(baseQuery)}` },
                ];
            }
        };

        getMenuItems().then(items => {
            items.forEach((item, index) => {
                if (item.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top: 1px solid #333; margin: 0; width: 100%;';
                    listContainer.appendChild(divider);
                    return;
                }

                const link = document.createElement('a');
                link.href = '#';
                link.textContent = item.text;
                link.style.cssText = `
                    display: block;
                    padding: 14px 24px;
                    color: #fff;
                    text-decoration: none;
                    cursor: pointer;
                    transition: background 0.2s;
                    font-size: 14px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                `;
                link.onmouseenter = () => link.style.background = '#333';
                link.onmouseleave = () => link.style.background = 'transparent';
                link.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeMenu();
                    window.open(item.url, '_blank');
                };
                listContainer.appendChild(link);
                
                if (index < items.length - 1 && !items[index + 1]?.isDivider) {
                    const divider = document.createElement('div');
                    divider.style.cssText = 'border-top: 1px solid #333; margin: 0; width: 100%;';
                    listContainer.appendChild(divider);
                }
            });
        });

        modal.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(listContainer);

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeMenu();
            }
        };

        overlay.appendChild(modal);

        escHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMenu();
            }
        };
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
            const el = document.querySelector(selector);
            if (el) {
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
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            setTimeout(() => {
                if (!document.querySelector('#imdb-search-btn')) {
                    tryAddButton();
                }
            }, 500);
        };
    }
})();