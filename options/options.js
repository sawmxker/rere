(function () {
    'use strict';

    const S = window.__RERE_OPTIONS_STATE__;

    let state = null;
    let isDirty = false;

    const defaultEngineNameInput = document.getElementById("defaultEngineName");
    const defaultEngineUrlInput = document.getElementById("defaultEngineUrl");
    const addDefaultEngineBtn = document.getElementById("addDefaultEngineBtn");
    const defaultBuilderPreview = document.getElementById("defaultBuilderPreview");
    const defaultEnginesList = document.getElementById("defaultEnginesList");
    const pickFromMenuBtn = document.getElementById("pickFromMenuBtn");
    const menuPickerModal = document.getElementById("menuPickerModal");
    const pickerList = document.getElementById("pickerList");
    const pickerCloseBtn = document.getElementById("pickerCloseBtn");
    const menuItemsList = document.getElementById("menuItemsList");
    const customEngineNameInput = document.getElementById("customEngineName");
    const customEngineUrlInput = document.getElementById("customEngineUrl");
    const customEngineQueryModeSelect = document.getElementById("customEngineQueryMode");
    const addCustomEngineBtn = document.getElementById("addCustomEngineBtn");
    const customBuilderPreview = document.getElementById("customBuilderPreview");
    const scrollToAddBtn = document.getElementById("scrollToAddBtn");
    const defaultEnginesSection = document.getElementById("defaultEnginesSection");
    const defaultEnginesHeader = document.getElementById("defaultEnginesHeader");
    const defaultEnginesBody = document.getElementById("defaultEnginesBody");
    const menuItemsSection = document.getElementById("menuItemsSection");
    const menuItemsHeader = document.getElementById("menuItemsHeader");
    const menuItemsBody = document.getElementById("menuItemsBody");
    const profileSelect = document.getElementById("profileSelect");
    const addProfileBtn = document.getElementById("addProfileBtn");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const deleteProfileBtn = document.getElementById("deleteProfileBtn");
    const profileSectionIndicator = document.getElementById("profileSectionIndicator");
    const menuProfileIndicator = document.getElementById("menuProfileIndicator");
    const profileSiteSelect = document.getElementById("profileSiteSelect");
    const suffixInput = document.getElementById("suffix");
    const engineSelect = document.getElementById("searchEngine");
    const searchQueryModeSelect = document.getElementById("searchQueryMode");
    const searchTitleModeSelect = document.getElementById("searchTitleModeMAL");
    const searchPreview = document.getElementById("searchPreview");
    const saveBtn = document.getElementById("saveBtn");
    const resetBtn = document.getElementById("resetBtn");
    const exportTriggerBtn = document.getElementById("exportTriggerBtn");
    const exportDropdown = document.getElementById("exportDropdown");
    const importFileInput = document.getElementById("importFileInput");
    const status = document.getElementById("status");
    const syncToggle = document.getElementById("syncEnabledToggle");
    const syncStatus = document.getElementById("syncStatus");

    function init() {
        S.initState(state);
        state = S.state;
    }

    function animateToggle(section, body) {
        if (section.classList.contains("collapsed")) {
            body.style.maxHeight = body.scrollHeight + "px";
            section.classList.remove("collapsed");
            const onEnd = () => { body.style.maxHeight = ""; body.removeEventListener("transitionend", onEnd); };
            body.addEventListener("transitionend", onEnd, { once: true });
        } else {
            body.style.maxHeight = body.scrollHeight + "px";
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    section.classList.add("collapsed");
                    body.style.maxHeight = "0";
                });
            });
        }
    }

    defaultEnginesHeader.addEventListener("click", () => animateToggle(defaultEnginesSection, defaultEnginesBody));
    menuItemsHeader.addEventListener("click", () => animateToggle(menuItemsSection, menuItemsBody));

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => { status.className = "status"; }, 5000);
    }

    function showSuggestion(message, onAccept) {
        status.innerHTML = '';
        status.className = 'status suggestion';
        const textSpan = document.createElement('span');
        textSpan.textContent = message;
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Enable';
        acceptBtn.className = 'mini-btn';
        acceptBtn.style.cssText = 'margin-left:12px;background:#f5c518;color:#000;border:none;font-weight:700;';
        acceptBtn.onclick = (e) => { e.stopPropagation(); if (onAccept) onAccept(); status.className = 'status'; };
        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.className = 'mini-btn';
        dismissBtn.style.cssText = 'margin-left:6px;';
        dismissBtn.onclick = (e) => { e.stopPropagation(); status.className = 'status'; };
        status.appendChild(textSpan);
        status.appendChild(acceptBtn);
        status.appendChild(dismissBtn);
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
            state.searchEngineId = state.searchEngines[0]?.id || S.DEFAULT_SETTINGS.searchEngineId;
        }
        engineSelect.value = state.searchEngineId;
    }

    function updateSearchPreview() {
        const selectedEngine = S.getSearchEngineById(state.searchEngineId);
        const previewUrl = selectedEngine
            ? S.buildSearchUrl(selectedEngine.url, state.searchQueryMode, state.suffix)
            : "";
        searchPreview.textContent = previewUrl ? `Example: ${previewUrl}` : "Example URL will appear here.";
    }

    function updateBuilderPreview() {
        defaultBuilderPreview.textContent = `Example: ${S.buildSearchUrl(defaultEngineUrlInput.value || "https://example.com/search?q=", "titleYear", "")}`;
        customBuilderPreview.textContent = `Example: ${S.buildSearchUrl(customEngineUrlInput.value || "https://example.com/search?q=", customEngineQueryModeSelect.value, "")}`;
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
        if (allowConfigured) {
            const opt = document.createElement('option');
            opt.value = 'configured'; opt.textContent = 'configured default';
            select.appendChild(opt);
        }
        const opt1 = document.createElement('option');
        opt1.value = 'title'; opt1.textContent = 'title';
        select.appendChild(opt1);
        const opt2 = document.createElement('option');
        opt2.value = 'titleYear'; opt2.textContent = 'title+year';
        select.appendChild(opt2);
        select.value = S.normalizeQueryMode(value, allowConfigured ? "configured" : "titleYear");
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
        upBtn.onclick = () => { state[collectionName] = S.moveItem(list, index, -1); render(); };
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "mini-btn";
        downBtn.textContent = "Down";
        downBtn.disabled = index === list.length - 1;
        downBtn.onclick = () => { state[collectionName] = S.moveItem(list, index, 1); render(); };
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

    function createClickableIcon(item) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Click to change icon";
        btn.style.cssText = "background:none;border:none;cursor:pointer;padding:0;border-radius:6px;display:flex;transition:opacity 0.15s;flex-shrink:0;";
        btn.onmouseenter = () => { btn.style.opacity = "0.7"; };
        btn.onmouseleave = () => { btn.style.opacity = "1"; };
        if (item.iconUrl) {
            const img = document.createElement("img");
            img.className = "engine-icon";
            img.src = item.iconUrl;
            img.alt = `${item.name} icon`;
            img.referrerPolicy = "no-referrer";
            img.onerror = function () { this.replaceWith(S.createFallbackIcon(item.name)); };
            btn.appendChild(img);
        } else {
            const url = item.usesSelectedEngine
                ? (S.getSearchEngineById(state.searchEngineId)?.url || item.url)
                : item.url;
            btn.appendChild(S.createFaviconElement(url, item.name));
        }
        btn.onclick = (e) => { e.stopPropagation(); openIconPicker(item); };
        return btn;
    }

    function createDragHandle() {
        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.textContent = "\u22EE\u22EE";
        handle.title = "Drag to reorder";
        return handle;
    }

    function createSearchEngineCard(engine, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        card.dataset.collection = "searchEngines";
        card.dataset.index = index;
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        const handle = createDragHandle();
        handle.draggable = true;
        title.appendChild(handle);
        title.appendChild(createClickableIcon(engine));
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
        nameInput.addEventListener("input", () => { engine.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);
        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = engine.url;
        urlInput.addEventListener("input", () => { engine.url = urlInput.value; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(urlWrap);
        card.appendChild(header);
        card.appendChild(fields);
        return card;
    }

    function createMenuItemCard(item, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        card.dataset.collection = "menuItems";
        card.dataset.index = index;
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        const handle = createDragHandle();
        handle.draggable = true;
        title.appendChild(handle);
        title.appendChild(createClickableIcon(item));
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
        nameInput.addEventListener("input", () => { item.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);
        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, item.usesSelectedEngine);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; isDirty = true; updateSaveButtonState(); });
        queryWrap.appendChild(querySelect);
        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.usesSelectedEngine ? (S.getSearchEngineById(state.searchEngineId)?.url || "") : item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; item.usesSelectedEngine = false; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = item.usesSelectedEngine
            ? "Currently follows the selected Default Search Engine. Editing this field will detach it and use your custom URL."
            : "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(queryWrap);

        const malModeWrap = document.createElement("div");
        malModeWrap.style.cssText = 'display:none;';
        malModeWrap.innerHTML = `<label>MAL API mode</label>`;
        const malModeSelect = document.createElement("select");
        malModeSelect.innerHTML = '<option value="none">Always no (use search)</option><option value="split">Split: search + API link</option><option value="always">Always use API</option>';
        malModeSelect.value = ["none", "split", "always"].includes(item.malApiMode) ? item.malApiMode : "none";
        malModeSelect.addEventListener("change", () => { item.malApiMode = malModeSelect.value; isDirty = true; updateSaveButtonState(); });
        malModeWrap.appendChild(malModeSelect);
        fields.appendChild(malModeWrap);

        const imdbModeWrap = document.createElement("div");
        imdbModeWrap.style.cssText = 'display:none;';
        imdbModeWrap.innerHTML = `<label>IMDb API mode</label>`;
        const imdbModeSelect = document.createElement("select");
        imdbModeSelect.innerHTML = '<option value="none">Always no (use search)</option><option value="split">Split: search + API link</option><option value="always">Always use API</option>';
        imdbModeSelect.value = ["none", "split", "always"].includes(item.imdbApiMode) ? item.imdbApiMode : "none";
        imdbModeSelect.addEventListener("change", () => { item.imdbApiMode = imdbModeSelect.value; isDirty = true; updateSaveButtonState(); });
        imdbModeWrap.appendChild(imdbModeSelect);
        fields.appendChild(imdbModeWrap);

        fields.appendChild(urlWrap);

        function updateMalModeVisibility() {
            malModeWrap.style.display = (item.url || "").toLowerCase().includes("myanimelist.net") ? "" : "none";
        }
        function updateImdbModeVisibility() {
            imdbModeWrap.style.display = (item.url || "").toLowerCase().includes("imdb.com") ? "" : "none";
        }
        updateMalModeVisibility();
        updateImdbModeVisibility();
        urlInput.addEventListener("input", () => { updateMalModeVisibility(); updateImdbModeVisibility(); });

        card.appendChild(header);
        card.appendChild(fields);
        return card;
    }

    function createCustomEngineCard(item, index) {
        const card = document.createElement("div");
        card.className = "engine-card";
        card.dataset.collection = "customEngines";
        card.dataset.index = index;
        const header = document.createElement("div");
        header.className = "engine-card-header";
        const title = document.createElement("div");
        title.className = "engine-title";
        const handle = createDragHandle();
        handle.draggable = true;
        title.appendChild(handle);
        title.appendChild(createClickableIcon(item));
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
        nameInput.addEventListener("input", () => { item.name = nameInput.value; isDirty = true; updateSaveButtonState(); });
        nameWrap.appendChild(nameInput);
        const queryWrap = document.createElement("div");
        queryWrap.innerHTML = `<label>Query Template</label>`;
        const querySelect = createQueryModeSelect(item.queryMode, false);
        querySelect.addEventListener("change", () => { item.queryMode = querySelect.value; isDirty = true; updateSaveButtonState(); });
        queryWrap.appendChild(querySelect);
        const urlWrap = document.createElement("div");
        urlWrap.className = "full-width";
        urlWrap.innerHTML = `<label>Search URL</label>`;
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.value = item.url;
        urlInput.addEventListener("input", () => { item.url = urlInput.value; isDirty = true; updateSaveButtonState(); });
        const help = document.createElement("div");
        help.className = "help-text";
        help.textContent = "If {query} is missing, it will be appended automatically. This may cause errors with non-standard search links.";
        urlWrap.appendChild(urlInput);
        urlWrap.appendChild(help);
        fields.appendChild(nameWrap);
        fields.appendChild(queryWrap);
        const malModeWrap = document.createElement("div");
        malModeWrap.style.cssText = 'display:none;';
        malModeWrap.innerHTML = `<label>MAL API mode</label>`;
        const malModeSelect = document.createElement("select");
        malModeSelect.innerHTML = '<option value="none">Always no (use search)</option><option value="split">Split: search + API link</option><option value="always">Always use API</option>';
        malModeSelect.value = ["none", "split", "always"].includes(item.malApiMode) ? item.malApiMode : "none";
        malModeSelect.addEventListener("change", () => { item.malApiMode = malModeSelect.value; isDirty = true; updateSaveButtonState(); });
        malModeWrap.appendChild(malModeSelect);
        fields.appendChild(malModeWrap);
        const imdbModeWrap = document.createElement("div");
        imdbModeWrap.style.cssText = 'display:none;';
        imdbModeWrap.innerHTML = `<label>IMDb API mode</label>`;
        const imdbModeSelect = document.createElement("select");
        imdbModeSelect.innerHTML = '<option value="none">Always no (use search)</option><option value="split">Split: search + API link</option><option value="always">Always use API</option>';
        imdbModeSelect.value = ["none", "split", "always"].includes(item.imdbApiMode) ? item.imdbApiMode : "none";
        imdbModeSelect.addEventListener("change", () => { item.imdbApiMode = imdbModeSelect.value; isDirty = true; updateSaveButtonState(); });
        imdbModeWrap.appendChild(imdbModeSelect);
        fields.appendChild(imdbModeWrap);
        function updateMalModeVisibility() {
            malModeWrap.style.display = (item.url || "").toLowerCase().includes("myanimelist.net") ? "" : "none";
        }
        function updateImdbModeVisibility() {
            imdbModeWrap.style.display = (item.url || "").toLowerCase().includes("imdb.com") ? "" : "none";
        }
        updateMalModeVisibility();
        updateImdbModeVisibility();
        urlInput.addEventListener("input", () => { updateMalModeVisibility(); updateImdbModeVisibility(); });
        fields.appendChild(urlWrap);
        card.appendChild(header);
        card.appendChild(fields);
        return card;
    }

    function renderDefaultEngines() {
        defaultEnginesList.innerHTML = "";
        if (state.searchEngines.length === 0) {
            defaultEnginesList.innerHTML = `<div class="empty-state">No default search engines yet.</div>`;
            return;
        }
        state.searchEngines.forEach((item, index) => defaultEnginesList.appendChild(createSearchEngineCard(item, index)));
        setupSearchEngineDragDrop();
    }

    let searchEngineDragInitialized = false;

    function setupSearchEngineDragDrop() {
        const container = defaultEnginesList;
        if (searchEngineDragInitialized) return;
        searchEngineDragInitialized = true;
        let srcCard = null;
        const onDragStart = (e) => {
            const handle = e.target.closest(".drag-handle");
            if (!handle) { e.preventDefault(); return; }
            srcCard = handle.closest(".engine-card");
            if (!srcCard) { e.preventDefault(); return; }
            srcCard.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "");
        };
        const onDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const tgt = e.target.closest(".engine-card");
            if (!tgt || tgt === srcCard) return;
            tgt.classList.add("drag-over");
        };
        const onDragLeave = (e) => {
            const tgt = e.target.closest(".engine-card");
            if (!tgt) return;
            tgt.classList.remove("drag-over");
        };
        const onDrop = (e) => {
            e.preventDefault();
            const tgtCard = e.target.closest(".engine-card");
            if (!tgtCard || !srcCard || tgtCard === srcCard) return;
            tgtCard.classList.remove("drag-over");
            const srcIdx = parseInt(srcCard.dataset.index, 10);
            const tgtIdx = parseInt(tgtCard.dataset.index, 10);
            const [moved] = state.searchEngines.splice(srcIdx, 1);
            state.searchEngines.splice(tgtIdx, 0, moved);
            isDirty = true;
            render();
        };
        const onDragEnd = () => {
            if (srcCard) { srcCard.classList.remove("dragging"); srcCard = null; }
            container.querySelectorAll(".engine-card.drag-over").forEach(c => c.classList.remove("drag-over"));
        };
        container.addEventListener("dragstart", onDragStart);
        container.addEventListener("dragover", onDragOver);
        container.addEventListener("dragleave", onDragLeave);
        container.addEventListener("drop", onDrop);
        container.addEventListener("dragend", onDragEnd);
    }

    function renderMenuItems() {
        menuItemsList.innerHTML = "";
        const allItems = [...state.menuItems, ...state.customEngines];
        if (allItems.length === 0) {
            menuItemsList.innerHTML = `<div class="empty-state">No quick search menu items yet.</div>`;
            return;
        }
        state.menuItems.forEach((item, index) => menuItemsList.appendChild(createMenuItemCard(item, index)));
        if (state.customEngines.length > 0) {
            state.customEngines.forEach((item, index) => menuItemsList.appendChild(createCustomEngineCard(item, index)));
        }
        setupDragDrop();
    }

    let dragDropInitialized = false;

    function setupDragDrop() {
        const container = menuItemsList;
        if (dragDropInitialized) return;
        dragDropInitialized = true;
        let srcCard = null;
        const onDragStart = (e) => {
            const handle = e.target.closest(".drag-handle");
            if (!handle) { e.preventDefault(); return; }
            srcCard = handle.closest(".engine-card");
            if (!srcCard) { e.preventDefault(); return; }
            srcCard.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "");
        };
        const onDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const tgt = e.target.closest(".engine-card");
            if (!tgt || tgt === srcCard) return;
            tgt.classList.add("drag-over");
        };
        const onDragLeave = (e) => {
            const tgt = e.target.closest(".engine-card");
            if (!tgt) return;
            tgt.classList.remove("drag-over");
        };
        const onDrop = (e) => {
            e.preventDefault();
            const tgtCard = e.target.closest(".engine-card");
            if (!tgtCard || !srcCard || tgtCard === srcCard) return;
            tgtCard.classList.remove("drag-over");
            const srcCol = srcCard.dataset.collection;
            const srcIdx = parseInt(srcCard.dataset.index, 10);
            const tgtCol = tgtCard.dataset.collection;
            const tgtIdx = parseInt(tgtCard.dataset.index, 10);
            const srcList = state[srcCol];
            const tgtList = state[tgtCol];
            if (!srcList || !tgtList) return;
            if (srcCol === tgtCol) {
                const [moved] = srcList.splice(srcIdx, 1);
                srcList.splice(tgtIdx, 0, moved);
            } else {
                const [moved] = srcList.splice(srcIdx, 1);
                tgtList.splice(tgtIdx, 0, moved);
            }
            isDirty = true;
            render();
        };
        const onDragEnd = () => {
            container.querySelectorAll(".engine-card").forEach(c => c.classList.remove("dragging", "drag-over"));
            srcCard = null;
        };
        container.addEventListener("dragstart", onDragStart);
        container.addEventListener("dragover", onDragOver);
        container.addEventListener("dragleave", onDragLeave);
        container.addEventListener("drop", onDrop);
        container.addEventListener("dragend", onDragEnd);
    }

    function updateSaveButtonState() {
        saveBtn.classList.toggle('btn-unsaved', isDirty);
    }

    function renderProfileSelect() {
        const currentId = state.activeProfileId;
        profileSelect.innerHTML = "";
        const ids = Object.keys(state.profiles);
        if (ids.length === 0) {
            const opt = document.createElement("option");
            opt.value = ""; opt.textContent = "No profiles";
            profileSelect.appendChild(opt);
            return;
        }
        ids.forEach((id) => {
            const p = state.profiles[id];
            if (!p) return;
            const opt = document.createElement("option");
            opt.value = id; opt.textContent = p.name || id;
            if (id === currentId) opt.selected = true;
            profileSelect.appendChild(opt);
        });
        const profile = S.getActiveProfile();
        const profileName = profile ? profile.name : "";
        profileSectionIndicator.textContent = `(Profile: ${profileName})`;
        menuProfileIndicator.textContent = `(Profile: ${profileName})`;
    }

    function findProfileBySite(site) {
        if (!site || site === "\u2014") return null;
        const ids = Object.keys(state.profiles);
        for (const id of ids) {
            const p = state.profiles[id];
            if (p && p.site === site && id !== state.activeProfileId) return p;
        }
        return null;
    }

    function renderSiteSelect() {
        const profile = S.getActiveProfile();
        profileSiteSelect.innerHTML = "";
        S.SITE_OPTIONS.forEach((opt) => {
            const option = document.createElement("option");
            option.value = opt.value; option.textContent = opt.label;
            if (profile && profile.site === opt.value) option.selected = true;
            profileSiteSelect.appendChild(option);
        });
    }

    function render() {
        updateEngineSelect();
        searchQueryModeSelect.value = state.searchQueryMode;
        suffixInput.value = state.suffix;
        searchTitleModeSelect.value = state.searchTitleMode || 'original';
        const grMode = document.getElementById("searchTitleModeGR");
        if (grMode) grMode.value = state.searchTitleModeGR || 'edition';
        renderDefaultEngines();
        renderMenuItems();
        updateSearchPreview();
        updateBuilderPreview();
        updateSaveButtonState();
        renderProfileSelect();
        renderSiteSelect();
        const toggle1 = document.getElementById("emptyProfilesToggle");
        if (toggle1) toggle1.checked = state.emptyProfilesByDefault;
        const toggle2 = document.getElementById("collapseDefaultToggle");
        if (toggle2) toggle2.checked = state.collapseDefaultEngines;
        const toggle3 = document.getElementById("collapseQuickToggle");
        if (toggle3) toggle3.checked = state.collapseQuickSearchMenu;
        defaultEnginesSection.classList.toggle("collapsed", state.collapseDefaultEngines);
        menuItemsSection.classList.toggle("collapsed", state.collapseQuickSearchMenu);
        const cb = (id) => document.getElementById(id);
        const setChecked = (id, val) => { const e = cb(id); if (e) e.checked = val; };
        const setVal = (id, val) => { const e = cb(id); if (e) e.value = val; };
        setChecked("imdbEnabledToggle", state.imdbEnabled);
        setChecked("malEnabledToggle", state.malEnabled);
        setChecked("grEnabledToggle", state.grEnabled);
        setChecked("grSubtleBorderToggle", state.grSubtleBorder);
        setChecked("contextMenuToggle", state.contextMenuEnabled);
        setChecked("malQuickLinkToggle", state.malQuickLink);
        setVal("imdbButtonLabelSelect", state.imdbButtonLabel);
        setVal("malButtonLabelSelect", state.malButtonLabel);
    }

    function hasMalDetection() {
        const profiles = state.profiles || {};
        for (const p of Object.values(profiles)) {
            if (p.site === "mal-anime" || p.site === "mal-manga") return true;
        }
        const allItems = [...state.menuItems, ...state.customEngines, ...state.searchEngines];
        for (const item of allItems) {
            if ((item.url || "").toLowerCase().includes("myanimelist.net")) return true;
        }
        return false;
    }

    // ── Icon Picker ─────────────────────────────────────────────

    let iconPickerTarget = null;
    const iconPickerModal = document.getElementById("iconPickerModal");
    const iconPickerCloseBtn = document.getElementById("iconPickerCloseBtn");
    const iconUrlInput = document.getElementById("iconUrlInput");
    const iconFileInput = document.getElementById("iconFileInput");
    const iconPreviewImg = document.getElementById("iconPreviewImg");
    const suggestedIcons = document.getElementById("suggestedIcons");
    const noSuggestions = document.getElementById("noSuggestions");
    const iconPickerApplyBtn = document.getElementById("iconPickerApplyBtn");
    const iconPickerRemoveBtn = document.getElementById("iconPickerRemoveBtn");

    function getItemDisplayUrl(item) {
        return item.usesSelectedEngine
            ? (S.getSearchEngineById(state.searchEngineId)?.url || item.url)
            : item.url;
    }

    function buildSuggestedIcons(item) {
        suggestedIcons.innerHTML = "";
        noSuggestions.style.display = "none";
        const url = getItemDisplayUrl(item);
        if (!url || url === "__DEFAULT_ENGINE__") {
            noSuggestions.style.display = "block";
            noSuggestions.textContent = "No URL defined yet";
            return;
        }
        const domains = S.extractDomainsFromUrl(url);
        if (domains.length === 0) {
            noSuggestions.style.display = "block";
            return;
        }
        domains.forEach((domain) => {
            const faviconUrl = `https://${domain}/favicon.ico`;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.title = domain;
            btn.style.cssText = "width:44px;height:44px;border-radius:10px;border:2px solid transparent;background:#2a2a2a;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;transition:border-color 0.15s;overflow:hidden;";
            btn.onmouseenter = () => { btn.style.borderColor = "#666"; };
            btn.onmouseleave = () => { btn.style.borderColor = "transparent"; };
            const img = document.createElement("img");
            img.src = faviconUrl;
            img.alt = domain;
            img.style.cssText = "width:28px;height:28px;object-fit:contain;";
            img.onerror = () => {
                img.style.display = "none";
                const fallback = document.createElement("div");
                fallback.style.cssText = "width:28px;height:28px;border-radius:6px;background:#3a3a3a;color:#ddd;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;text-transform:uppercase;";
                fallback.textContent = domain.charAt(0).toUpperCase();
                btn.appendChild(fallback);
            };
            btn.appendChild(img);
            btn.onclick = () => { setIconPreview(faviconUrl); iconUrlInput.value = faviconUrl; };
            suggestedIcons.appendChild(btn);
        });
    }

    function setIconPreview(url) {
        iconPreviewImg.src = url;
        iconPreviewImg.style.display = url ? "" : "none";
        iconPreviewImg.onerror = () => { iconPreviewImg.style.display = "none"; };
    }

    function openIconPicker(item) {
        iconPickerTarget = item;
        iconUrlInput.value = item.iconUrl || "";
        iconFileInput.value = "";
        setIconPreview(item.iconUrl || "");
        buildSuggestedIcons(item);
        iconPickerModal.classList.add("show");
    }

    iconPickerCloseBtn.addEventListener("click", () => { iconPickerModal.classList.remove("show"); iconPickerTarget = null; });
    iconPickerModal.addEventListener("click", (e) => { if (e.target === iconPickerModal) { iconPickerModal.classList.remove("show"); iconPickerTarget = null; } });
    iconUrlInput.addEventListener("input", () => { const val = iconUrlInput.value.trim(); setIconPreview(val); });
    iconFileInput.addEventListener("change", () => {
        const file = iconFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { const dataUrl = e.target.result; iconUrlInput.value = dataUrl; setIconPreview(dataUrl); };
        reader.readAsDataURL(file);
    });
    iconPickerApplyBtn.addEventListener("click", () => {
        if (!iconPickerTarget) return;
        iconPickerTarget.iconUrl = iconUrlInput.value.trim();
        iconPickerModal.classList.remove("show");
        iconPickerTarget = null;
        render();
        showStatus("Icon updated", "success");
    });
    iconPickerRemoveBtn.addEventListener("click", () => {
        if (!iconPickerTarget) return;
        iconPickerTarget.iconUrl = "";
        iconPickerModal.classList.remove("show");
        iconPickerTarget = null;
        render();
        showStatus("Icon removed", "success");
    });

    // ── Menu Picker ────────────────────────────────────────────

    function populatePicker() {
        pickerList.textContent = '';
        const allItems = [...state.menuItems, ...state.customEngines];
        if (allItems.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No menu items yet.';
            pickerList.appendChild(empty);
            return;
        }
        allItems.forEach((item) => {
            const el = document.createElement("div");
            el.className = "picker-item";
            const url = item.usesSelectedEngine ? (S.getSearchEngineById(state.searchEngineId)?.url || item.url) : item.url;
            el.appendChild(S.createFaviconElement(url, item.name));
            const textWrap = document.createElement("div");
            textWrap.style.minWidth = "0";
            const nameDiv = document.createElement('div');
            nameDiv.className = 'picker-item-name';
            nameDiv.textContent = item.name;
            textWrap.appendChild(nameDiv);
            const urlDiv = document.createElement('div');
            urlDiv.className = 'picker-item-url';
            urlDiv.textContent = url;
            textWrap.appendChild(urlDiv);
            el.appendChild(textWrap);
            el.addEventListener("click", () => {
                defaultEngineNameInput.value = item.name;
                defaultEngineUrlInput.value = url;
                updateBuilderPreview();
                menuPickerModal.classList.remove("show");
            });
            pickerList.appendChild(el);
        });
    }

    pickFromMenuBtn.addEventListener("click", () => { populatePicker(); menuPickerModal.classList.add("show"); });
    pickerCloseBtn.addEventListener("click", () => { menuPickerModal.classList.remove("show"); });
    menuPickerModal.addEventListener("click", (e) => { if (e.target === menuPickerModal) menuPickerModal.classList.remove("show"); });

    // ── Import / Export ────────────────────────────────────────

    function downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportSettings() {
        const profile = S.getActiveProfile();
        if (profile) S.saveCurrentProfileToState();
        const data = S.serializeSettings();
        downloadJson(data, `rere-settings-${new Date().toISOString().slice(0, 10)}.json`);
        showStatus("Settings exported", "success");
        closeExportDropdown();
    }

    function exportProfile() {
        const profile = S.getActiveProfile();
        if (!profile) return;
        S.saveCurrentProfileToState();
        const safeName = profile.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadJson({ ...profile }, `rere-profile-${safeName}-${new Date().toISOString().slice(0, 10)}.json`);
        showStatus(`Profile "${profile.name}" exported`, "success");
        closeExportDropdown();
    }

    function encodeSettings(obj) {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return "rere:import:" + btoa(binary);
    }

    function decodeSettings(str) {
        const prefix = "rere:import:";
        let encoded = str;
        if (encoded.startsWith(prefix)) encoded = encoded.slice(prefix.length);
        encoded = encoded.trim();
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                S.saveCurrentProfileToState();
                const { firstNewId, added, skipped } = S.importData(data);
                if (firstNewId) { state.activeProfileId = firstNewId; S.loadProfileIntoState(state.profiles[firstNewId]); }
                await storageSet(S.serializeSettings());
                render();
                isDirty = false;
                updateSaveButtonState();
                const parts = [];
                if (added > 0) parts.push(added + " profile(s) added");
                if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                showStatus("Settings imported: " + (parts.join(", ") || "no changes"), "success");
            } catch (err) {
                console.error("Import error:", err);
                showStatus("Failed to import settings: invalid file", "error");
            }
        };
        reader.readAsText(file);
        closeExportDropdown();
    }

    function importFromStr(str) {
        try {
            const data = decodeSettings(str);
            S.saveCurrentProfileToState();
            const { firstNewId, added, skipped } = S.importData(data);
            if (firstNewId) { state.activeProfileId = firstNewId; S.loadProfileIntoState(state.profiles[firstNewId]); }
            storageSet(S.serializeSettings()).then(() => {
                render();
                isDirty = false;
                updateSaveButtonState();
                const parts = [];
                if (added > 0) parts.push(added + " profile(s) added");
                if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                showStatus("Imported from link: " + (parts.join(", ") || "no changes"), "success");
            });
        } catch (err) {
            console.error("Import from link error:", err);
            showStatus("Failed to parse import link", "error");
        }
    }

    function closeExportDropdown() {
        exportDropdown.classList.remove("show");
        exportTriggerBtn.classList.remove("active");
    }

    exportTriggerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle("show");
        exportTriggerBtn.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".save-group")) closeExportDropdown();
    });

    exportDropdown.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === "export") exportSettings();
        else if (action === "import") importFileInput.click();
        else if (action === "export-profile") exportProfile();
        else if (action === "copy-link") {
            const profile = S.getActiveProfile();
            if (profile) S.saveCurrentProfileToState();
            const data = S.serializeSettings();
            const link = encodeSettings(data);
            navigator.clipboard.writeText(link).then(() => showStatus("Import link copied to clipboard", "success")).catch(() => showStatus("Failed to copy to clipboard", "error"));
            closeExportDropdown();
        } else if (action === "paste-clipboard") {
            navigator.clipboard.readText().then(text => {
                const val = text.trim();
                if (!val) { showStatus("Clipboard is empty", "error"); return; }
                importFromStr(val);
            }).catch(() => showStatus("Cannot read clipboard. Grant permission or paste via Ctrl+V.", "error"));
            closeExportDropdown();
        } else if (action === "copy-profile") {
            S.saveCurrentProfileToState();
            const profile = S.getActiveProfile();
            if (profile) {
                const link = encodeSettings(profile);
                navigator.clipboard.writeText(link).then(() => showStatus('Profile "' + profile.name + '" link copied', "success")).catch(() => showStatus("Failed to copy to clipboard", "error"));
            }
            closeExportDropdown();
        }
    });

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) importSettings(file);
        importFileInput.value = "";
    });

    // ── Init ───────────────────────────────────────────────────

    document.addEventListener("DOMContentLoaded", async () => {
        try {
            state = S.normalizeSettings(await storageGet(null));
            init();
            render();
            isDirty = false;
            updateSaveButtonState();
            if (hasMalDetection() && !state.malQuickLink) {
                setTimeout(() => {
                    showSuggestion("MyAnimeList detected! Enable MAL Quick Link to get direct page links via Jikan API.", () => {
                        state.malQuickLink = true;
                        const toggle = document.getElementById('malQuickLinkToggle');
                        if (toggle) toggle.checked = true;
                        isDirty = true;
                        updateSaveButtonState();
                        showStatus('MAL Quick Link enabled! Save settings to apply.', 'success');
                    });
                }, 600);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            state = S.createDefaultState();
            init();
            render();
            isDirty = false;
            updateSaveButtonState();
            showStatus("Error loading settings", "error");
        }

        // Sync listener
        browser.storage.onChanged.addListener(async (changes, area) => {
            if (area !== "local") return;
            if (!changes._syncMeta) return;
            const relevant = Object.keys(changes).some(k => k !== "_syncMeta");
            if (!relevant) return;
            if (isDirty) {
                showStatus("Settings updated from another device — save or reload to see changes.", "warning");
            } else {
                state = S.normalizeSettings(await storageGet(null));
                init();
                render();
                isDirty = false;
                updateSaveButtonState();
                showStatus("Settings synced from another device", "success");
            }
        });

        // Event bindings
        engineSelect.addEventListener("change", () => {
            state.searchEngineId = engineSelect.value;
            isDirty = true;
            updateSaveButtonState();
            render();
        });
        searchQueryModeSelect.addEventListener("change", () => {
            state.searchQueryMode = searchQueryModeSelect.value;
            isDirty = true;
            updateSaveButtonState();
            updateSearchPreview();
        });
        suffixInput.addEventListener("input", () => {
            state.suffix = suffixInput.value;
            isDirty = true;
            updateSaveButtonState();
            updateSearchPreview();
        });
        searchTitleModeSelect.addEventListener("change", () => {
            state.searchTitleMode = searchTitleModeSelect.value;
            isDirty = true;
            updateSaveButtonState();
        });
        const grMode = document.getElementById("searchTitleModeGR");
        if (grMode) {
            grMode.addEventListener("change", () => {
                state.searchTitleModeGR = grMode.value;
                isDirty = true;
                updateSaveButtonState();
            });
        }
        profileSelect.addEventListener("change", () => {
            const newId = profileSelect.value;
            if (!newId || newId === state.activeProfileId) return;
            const oldProfile = S.getActiveProfile();
            if (oldProfile) {
                oldProfile.suffix = state.suffix;
                oldProfile.searchQueryMode = state.searchQueryMode;
                oldProfile.menuItems = state.menuItems;
                oldProfile.customEngines = state.customEngines;
            }
            state.activeProfileId = newId;
            const newProfile = S.getActiveProfile();
            if (newProfile) {
                state.suffix = newProfile.suffix;
                state.searchQueryMode = newProfile.searchQueryMode;
                state.menuItems = newProfile.menuItems;
                state.customEngines = newProfile.customEngines;
            }
            render();
        });
        addProfileBtn.addEventListener("click", () => {
            const name = prompt("Enter a name for the new profile:");
            if (!name || !name.trim()) return;
            const id = "profile_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
            const newProfile = {
                id, name: name.trim(), site: "\u2014",
                suffix: S.DEFAULT_SETTINGS.suffix,
                searchQueryMode: S.DEFAULT_SETTINGS.searchQueryMode,
                menuItems: state.emptyProfilesByDefault ? [] : [{ id: "menu_search", name: "Search in new tab", url: "__DEFAULT_ENGINE__", queryMode: "titleYear", builtIn: true, usesSelectedEngine: true }],
                customEngines: []
            };
            state.profiles[id] = newProfile;
            state.activeProfileId = id;
            S.loadProfileIntoState(newProfile);
            render();
            showStatus("Profile created", "success");
        });
        deleteProfileBtn.addEventListener("click", () => {
            const ids = Object.keys(state.profiles);
            if (ids.length <= 1) { showStatus("Cannot delete the last profile", "error"); return; }
            const profile = S.getActiveProfile();
            if (!profile) return;
            if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) return;
            delete state.profiles[state.activeProfileId];
            const remainingIds = Object.keys(state.profiles);
            state.activeProfileId = remainingIds[0];
            S.loadProfileIntoState(state.profiles[remainingIds[0]]);
            render();
            showStatus("Profile deleted", "success");
        });
        editProfileBtn.addEventListener("click", () => {
            const profile = S.getActiveProfile();
            if (!profile) return;
            const newName = prompt("Edit profile name:", profile.name);
            if (newName && newName.trim()) { profile.name = newName.trim(); render(); showStatus("Profile renamed", "success"); }
        });
        profileSiteSelect.addEventListener("change", () => {
            const newSite = profileSiteSelect.value;
            if (!newSite) return;
            const profile = S.getActiveProfile();
            if (!profile) return;
            const conflicting = findProfileBySite(newSite);
            if (conflicting) {
                if (!confirm(`Site "${newSite}" is already assigned to profile "${conflicting.name}". Remove it from "${conflicting.name}" and assign to "${profile.name}"?`)) {
                    renderSiteSelect();
                    return;
                }
                conflicting.site = "\u2014";
            }
            profile.site = newSite;
            isDirty = true;
            updateSaveButtonState();
        });
        defaultEngineUrlInput.addEventListener("input", updateBuilderPreview);
        customEngineUrlInput.addEventListener("input", updateBuilderPreview);
        customEngineQueryModeSelect.addEventListener("change", updateBuilderPreview);
        addDefaultEngineBtn.addEventListener("click", () => {
            const name = defaultEngineNameInput.value.trim();
            const url = defaultEngineUrlInput.value.trim();
            if (!name || !url) { showStatus("Please enter both name and URL", "error"); return; }
            if (!S.isValidHttpUrl(url)) { showStatus("URL must start with http:// or https://", "error"); return; }
            state.searchEngines.push({ id: S.makeId("engine"), name, url: S.ensureQueryPlaceholder(url), builtIn: false });
            defaultEngineNameInput.value = "";
            defaultEngineUrlInput.value = "";
            isDirty = true;
            render();
            updateSaveButtonState();
            showStatus("Default search engine added to the draft list", "success");
        });
        addCustomEngineBtn.addEventListener("click", () => {
            const name = customEngineNameInput.value.trim();
            const url = customEngineUrlInput.value.trim();
            const queryMode = customEngineQueryModeSelect.value;
            if (!name || !url) { showStatus("Please enter both name and URL", "error"); return; }
            if (!S.isValidHttpUrl(url)) { showStatus("URL must start with http:// or https://", "error"); return; }
            state.customEngines.push({ id: S.makeId("custom"), name, url: S.ensureQueryPlaceholder(url), queryMode: S.normalizeQueryMode(queryMode), malApiMode: "none", imdbApiMode: "none" });
            customEngineNameInput.value = "";
            customEngineUrlInput.value = "";
            customEngineQueryModeSelect.value = "titleYear";
            isDirty = true;
            render();
            updateSaveButtonState();
            showStatus("Search engine added to the draft list", "success");
        });
        scrollToAddBtn.addEventListener("click", () => {
            document.getElementById("addForm").scrollIntoView({ behavior: "smooth", block: "start" });
        });
        saveBtn.addEventListener("click", async () => {
            state.suffix = suffixInput.value.trim();
            state.searchEngineId = engineSelect.value;
            state.searchQueryMode = searchQueryModeSelect.value;
            state.searchTitleMode = searchTitleModeSelect.value;
            const profile = S.getActiveProfile();
            if (profile) {
                profile.suffix = state.suffix;
                profile.searchQueryMode = state.searchQueryMode;
                profile.menuItems = state.menuItems;
                profile.customEngines = state.customEngines;
            }
            const invalidDefault = state.searchEngines.find((item) => !item.name.trim() || !S.isValidHttpUrl(item.url));
            const invalidMenuItem = state.menuItems.find((item) => { if (!item.name.trim()) return true; if (item.usesSelectedEngine) return false; return !S.isValidHttpUrl(item.url); });
            const invalidCustom = state.customEngines.find((item) => !item.name.trim() || !S.isValidHttpUrl(item.url));
            if (invalidDefault || invalidMenuItem || invalidCustom) { showStatus("Every item needs a name and a valid URL", "error"); return; }
            if (state.searchEngines.length === 0) { showStatus("At least one default search engine must remain", "error"); return; }
            try {
                await storageSet(S.serializeSettings());
                showStatus("Settings saved successfully!", "success");
                render();
                isDirty = false;
                updateSaveButtonState();
            } catch (error) { console.error("Error saving settings:", error); showStatus("Error saving settings", "error"); }
        });
        resetBtn.addEventListener("click", async () => {
            if (!confirm("Reset all settings to default values?")) return;
            try {
                state = S.createDefaultState();
                init();
                await storageSet(S.serializeSettings());
                defaultEngineNameInput.value = "";
                defaultEngineUrlInput.value = "";
                customEngineNameInput.value = "";
                customEngineUrlInput.value = "";
                customEngineQueryModeSelect.value = "titleYear";
                render();
                isDirty = false;
                updateSaveButtonState();
                showStatus("Settings reset to defaults", "success");
            } catch (error) { console.error("Error resetting settings:", error); showStatus("Error resetting settings", "error"); }
        });

        // Toggles
        const bindToggle = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("change", () => { state[key] = el.checked; isDirty = true; updateSaveButtonState(); });
        };
        const bindSelect = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("change", () => { state[key] = el.value; isDirty = true; updateSaveButtonState(); });
        };
        bindToggle("imdbEnabledToggle", "imdbEnabled");
        bindToggle("malEnabledToggle", "malEnabled");
        bindToggle("grEnabledToggle", "grEnabled");
        bindToggle("grSubtleBorderToggle", "grSubtleBorder");
        bindToggle("contextMenuToggle", "contextMenuEnabled");
        bindToggle("malQuickLinkToggle", "malQuickLink");
        bindSelect("imdbButtonLabelSelect", "imdbButtonLabel");
        bindSelect("malButtonLabelSelect", "malButtonLabel");

        const emptyToggle = document.getElementById("emptyProfilesToggle");
        if (emptyToggle) emptyToggle.addEventListener("change", () => { state.emptyProfilesByDefault = emptyToggle.checked; isDirty = true; updateSaveButtonState(); });
        const collapseDefaultToggle = document.getElementById("collapseDefaultToggle");
        if (collapseDefaultToggle) collapseDefaultToggle.addEventListener("change", () => { state.collapseDefaultEngines = collapseDefaultToggle.checked; defaultEnginesSection.classList.toggle("collapsed", state.collapseDefaultEngines); isDirty = true; updateSaveButtonState(); });
        const collapseQuickToggle = document.getElementById("collapseQuickToggle");
        if (collapseQuickToggle) collapseQuickToggle.addEventListener("change", () => { state.collapseQuickSearchMenu = collapseQuickToggle.checked; menuItemsSection.classList.toggle("collapsed", state.collapseQuickSearchMenu); isDirty = true; updateSaveButtonState(); });

        if (syncToggle) {
            storageGetSyncEnabled().then(enabled => { syncToggle.checked = enabled; });
            syncToggle.addEventListener("change", async () => {
                const enable = syncToggle.checked;
                if (enable) {
                    if (!await storageGetSyncEnabled()) {
                        syncStatus.textContent = "Migrating data to Firefox Sync\u2026";
                        syncStatus.style.display = "block";
                        try {
                            await storageSet(S.serializeSettings());
                            await storageMigrateLocalToSync();
                            await storageSetSyncEnabled(true);
                            syncStatus.textContent = "Sync enabled. Your data will now sync across devices.";
                            setTimeout(() => { syncStatus.style.display = "none"; }, 4000);
                        } catch (err) { syncToggle.checked = false; syncStatus.textContent = "Sync error: " + err.message; syncStatus.style.display = "block"; }
                    }
                } else {
                    syncStatus.textContent = "Migrating data to local storage\u2026";
                    syncStatus.style.display = "block";
                    try {
                        await storageSet(S.serializeSettings());
                        await storageMigrateSyncToLocal();
                        await storageSetSyncEnabled(false);
                        syncStatus.textContent = "Sync disabled. Data is now stored locally only.";
                        setTimeout(() => { syncStatus.style.display = "none"; }, 4000);
                    } catch (err) { syncToggle.checked = true; syncStatus.textContent = "Migration error: " + err.message; syncStatus.style.display = "block"; }
                }
            });
        }

        // Tab switching
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
                btn.classList.add("active");
                const panel = document.getElementById("tab" + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1));
                if (panel) panel.classList.add("active");
            });
        });

        // Handle hash auto-import on page load
        if (window.location.hash.startsWith("#import=")) {
            const encoded = window.location.hash.slice("#import=".length);
            try {
                const data = decodeSettings(encoded);
                S.saveCurrentProfileToState();
                const { firstNewId, added, skipped } = S.importData(data);
                if (firstNewId) { state.activeProfileId = firstNewId; S.loadProfileIntoState(state.profiles[firstNewId]); }
                storageSet(S.serializeSettings()).then(() => {
                    render();
                    isDirty = false;
                    updateSaveButtonState();
                    const parts = [];
                    if (added > 0) parts.push(added + " profile(s) added");
                    if (skipped > 0) parts.push(skipped + " duplicate(s) skipped");
                    showStatus("Auto-imported: " + (parts.join(", ") || "no changes"), "success");
                    history.replaceState(null, "", window.location.pathname);
                });
            } catch (err) { console.error("Hash auto-import error:", err); showStatus("Failed to auto-import from URL", "error"); }
        }
    });
})();
