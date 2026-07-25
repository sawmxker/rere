const SYNC_FLAG = "_syncEnabled";
const SYNC_META_KEY = "_syncMeta";

let _syncCache = null;

// ── Compression ──────────────────────────────────────────────

async function _compress(obj) {
    const json = JSON.stringify(obj);
    const input = new TextEncoder().encode(json);
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    const reader = cs.readable.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return _base64Encode(_concatUint8(chunks));
}

async function _decompress(base64) {
    const bytes = _base64Decode(base64);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const ds = new DecompressionStream("gzip");
    const stream = blob.stream().pipeThrough(ds);
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return JSON.parse(new TextDecoder().decode(_concatUint8(chunks)));
}

function _concatUint8(arrays) {
    const total = arrays.reduce((a, b) => a + b.length, 0);
    const r = new Uint8Array(total);
    let off = 0;
    for (const arr of arrays) { r.set(arr, off); off += arr.length; }
    return r;
}

function _base64Encode(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}

function _base64Decode(b64) {
    const s = atob(b64);
    const r = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) r[i] = s.charCodeAt(i);
    return r;
}

// ── Sync flag ────────────────────────────────────────────────

async function _loadSyncFlag() {
    if (_syncCache !== null) return _syncCache;
    try {
        _syncCache = !!(await browser.storage.sync.get(SYNC_FLAG))[SYNC_FLAG];
    } catch {
        _syncCache = false;
    }
    return _syncCache;
}

function _setSyncFlag(val) { _syncCache = val; }

async function _getArea() {
    return (await _loadSyncFlag()) ? browser.storage.sync : browser.storage.local;
}

// ── Local metadata (per-domain timestamps) ───────────────────

async function _getLocalMeta() {
    try { return (await browser.storage.local.get(SYNC_META_KEY))[SYNC_META_KEY] || {}; }
    catch { return {}; }
}

async function _setLocalMeta(key, lm) {
    const meta = await _getLocalMeta();
    meta[key] = lm;
    await browser.storage.local.set({ [SYNC_META_KEY]: meta });
}

async function _setLocalMetaBatch(updates) {
    const meta = await _getLocalMeta();
    Object.assign(meta, updates);
    await browser.storage.local.set({ [SYNC_META_KEY]: meta });
}

// ── Domain splitting ─────────────────────────────────────────

function _extractDomains(state) {
    const d = {};
    d._s = {
        searchEngineId: state.searchEngineId,
        activeProfileId: state.activeProfileId,
        emptyProfilesByDefault: state.emptyProfilesByDefault,
        collapseDefaultEngines: state.collapseDefaultEngines,
        collapseQuickSearchMenu: state.collapseQuickSearchMenu,
        imdbEnabled: state.imdbEnabled,
        malEnabled: state.malEnabled,
        grEnabled: state.grEnabled,
        contextMenuEnabled: state.contextMenuEnabled,
        imdbButtonLabel: state.imdbButtonLabel,
        malButtonLabel: state.malButtonLabel,
        malQuickLink: state.malQuickLink,
        searchTitleMode: state.searchTitleMode
    };
    if (state.searchEngines) {
        d._e = state.searchEngines.map(e => ({
            id: e.id, name: e.name, url: e.url, builtIn: !!e.builtIn
        }));
    }
    if (state.profiles) {
        for (const [id, p] of Object.entries(state.profiles)) {
            d["_p_" + id] = {
                id: p.id, name: p.name, site: p.site,
                suffix: p.suffix, searchQueryMode: p.searchQueryMode,
                menuItems: (p.menuItems || []).map(i => ({
                    id: i.id, name: i.name, url: i.url,
                    queryMode: i.queryMode, builtIn: !!i.builtIn,
                    usesSelectedEngine: !!i.usesSelectedEngine,
                    iconUrl: i.iconUrl || "",
                    malApiMode: i.malApiMode || "none"
                })),
                customEngines: (p.customEngines || []).map(i => ({
                    id: i.id, name: i.name, url: i.url,
                    queryMode: i.queryMode, iconUrl: i.iconUrl || ""
                }))
            };
        }
    }
    return d;
}

function _applyDomain(syncKey, data, target) {
    if (syncKey === "_s") {
        Object.assign(target, data);
    } else if (syncKey === "_e") {
        target.searchEngines = data;
    } else if (syncKey.startsWith("_p_")) {
        const pid = syncKey.slice(3);
        if (!target.profiles) target.profiles = {};
        target.profiles[pid] = data;
    }
}

// ── Sync push / pull ─────────────────────────────────────────

async function _pushDomains(domainEntries, lm) {
    const existing = {};
    try { Object.assign(existing, await browser.storage.sync.get(null)); } catch {}
    delete existing[SYNC_FLAG];

    const localMeta = await _getLocalMeta();
    const updates = {};

    for (const [key, data] of Object.entries(domainEntries)) {
        const syncEntry = existing[key];
        const syncLM = syncEntry ? (syncEntry.lm || 0) : 0;
        const localLM = localMeta[key] || 0;
        if (localLM >= syncLM || !syncEntry) {
            updates[key] = { v: await _compress(data), c: 1, lm };
        }
    }

    if (Object.keys(updates).length > 0) {
        await browser.storage.sync.set(updates);
        const metaUpdates = {};
        for (const k of Object.keys(updates)) metaUpdates[k] = lm;
        await _setLocalMetaBatch(metaUpdates);
    }
}

async function storagePullFromSync() {
    let syncAll;
    try { syncAll = await browser.storage.sync.get(null); } catch { return; }
    delete syncAll[SYNC_FLAG];
    const keys = Object.keys(syncAll);
    if (keys.length === 0) return;

    const localData = (await browser.storage.local.get(null)) || {};
    const localMeta = await _getLocalMeta();
    const changed = {};
    let hasChanges = false;

    for (const key of keys) {
        const entry = syncAll[key];
        if (!entry || !entry.lm) continue;
        const syncLM = entry.lm;
        const localLM = localMeta[key] || 0;
        if (syncLM > localLM) {
            try {
                const data = entry.c ? await _decompress(entry.v) : JSON.parse(atob(entry.v));
                _applyDomain(key, data, changed);
                localMeta[key] = syncLM;
                hasChanges = true;
            } catch (e) {
                console.warn("Sync pull: failed to decode key", key, e);
            }
        }
    }

    if (hasChanges) {
        changed[SYNC_META_KEY] = localMeta;
        for (const k of Object.keys(localData)) {
            if (changed[k] === undefined) changed[k] = localData[k];
        }
        await browser.storage.local.set(changed);
    }
}

// ── Public API ───────────────────────────────────────────────

async function storageGet(keys) {
    const area = await _getArea();
    return area.get(keys);
}

async function storageSet(items) {
    const area = await _getArea();
    await area.set(items);
    if (await _loadSyncFlag()) {
        const dm = _extractDomains(items);
        _pushDomains(dm, Date.now()).catch(e =>
            console.warn("Sync push failed (local data safe):", e)
        );
    }
}

async function storageClear() {
    const area = await _getArea();
    await area.clear();
}

async function storageGetSyncEnabled() { return _loadSyncFlag(); }
function storageInvalidateSyncCache() { _syncCache = null; }

async function storageSetSyncEnabled(enabled) {
    await browser.storage.sync.set({ [SYNC_FLAG]: enabled });
    _setSyncFlag(enabled);
}

async function storageMigrateLocalToSync() {
    const data = await browser.storage.local.get(null);
    delete data[SYNC_FLAG];
    delete data[SYNC_META_KEY];
    // Size check per key
    const dm = _extractDomains(data);
    for (const [key, val] of Object.entries(dm)) {
        const raw = await _compress(val);
        const size = Math.ceil(raw.length * 0.75);
        if (size > 8192) {
            throw new Error(key + " is ~" + Math.round(size / 1024 * 10) / 10 + " KB compressed, exceeds sync limit");
        }
    }
    const now = Date.now();
    await _pushDomains(dm, now);
    await _setLocalMetaBatch(
        Object.fromEntries(Object.keys(dm).map(k => [k, now]))
    );
}

async function storageMigrateSyncToLocal() {
    await storagePullFromSync();
}

// Run pull on init (background scripts only)
if (typeof browser !== "undefined" && browser.runtime && browser.runtime.getBackgroundPage) {
    _loadSyncFlag().then(enabled => {
        if (enabled) storagePullFromSync().catch(() => {});
    });
}
