(function () {
    'use strict';

    function normalizeDomain(d) {
        return String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
    }

    function domainMatches(configured, host) {
        const a = normalizeDomain(configured);
        const h = normalizeDomain(host);
        if (!a || !h) return false;
        return h === a || h.endsWith('.' + a);
    }

    // Adds `!important` to every CSS declaration so user styles beat
    // the site's own stylesheet, without requiring the user to type it.
    function autoImportant(css) {
        if (typeof css !== 'string' || !css) return css;
        let out = '';
        let i = 0;
        const n = css.length;
        let depth = 0;
        const impStack = [false];
        let decl = '';

        while (i < n) {
            const c = css[i];
            if (c === '/' && css[i + 1] === '*') {
                const end = css.indexOf('*/', i + 2);
                decl += css.slice(i, end === -1 ? n : end + 2);
                i = end === -1 ? n : end + 2;
                continue;
            }
            if (c === '"' || c === "'") {
                const q = c;
                let j = i + 1;
                while (j < n) {
                    if (css[j] === '\\') { j += 2; continue; }
                    if (css[j] === q) { j++; break; }
                    j++;
                }
                decl += css.slice(i, j);
                i = j;
                continue;
            }
            if (c === '{') {
                const prelude = decl.trim().toLowerCase();
                const isKf = prelude.indexOf('@keyframes') !== -1 || prelude.indexOf('@-webkit-keyframes') !== -1;
                out += decl;
                decl = '';
                depth++;
                impStack.push(isKf);
                out += c;
                i++;
                continue;
            }
            if (c === '}') {
                if (depth > 0) {
                    const addImp = !impStack.some(Boolean);
                    if (addImp && decl.trim() && !/!\s*important\s*$/i.test(decl.trim())) {
                        out += decl.replace(/\s+$/, '') + ' !important';
                    } else {
                        out += decl;
                    }
                    decl = '';
                    impStack.pop();
                    depth--;
                }
                out += c;
                i++;
                continue;
            }
            if (c === ';' && depth > 0) {
                const addImp = !impStack.some(Boolean);
                if (addImp && decl.trim() && !/!\s*important\s*$/i.test(decl.trim())) {
                    out += decl.replace(/\s+$/, '') + ' !important';
                } else {
                    out += decl;
                }
                out += ';';
                decl = '';
                i++;
                continue;
            }
            decl += c;
            i++;
        }
        out += decl;
        return out;
    }

    let appliedNodes = [];
    let lastAddonsSignature = '';

    function signatureOf(addons) {
        try { return JSON.stringify(addons); } catch (e) { return ''; }
    }

    function removeApplied() {
        for (const node of appliedNodes) {
            try {
                if (node && node.parentNode) node.parentNode.removeChild(node);
            } catch (e) {}
        }
        appliedNodes = [];
    }

    function applyFiles(addon) {
        removeApplied();
        const files = Array.isArray(addon.files) ? addon.files : [];
        for (const file of files) {
            if (!file || file.enabled === false) continue;
            if (!file.content) continue;
            if (file.type === 'css') {
                const style = document.createElement('style');
                style.setAttribute('data-rere-addon', addon.id || '');
                (document.head || document.documentElement).appendChild(style);
                style.textContent = autoImportant(file.content);
                appliedNodes.push(style);
            } else if (file.type === 'js') {
                const script = document.createElement('script');
                script.setAttribute('data-rere-addon', addon.id || '');
                (document.head || document.documentElement).appendChild(script);
                script.textContent = file.content;
                appliedNodes.push(script);
            }
        }
    }

    async function apply() {
        if (typeof storageGet !== 'function') return;
        let data;
        try { data = await storageGet(null); } catch (e) { return; }
        const addons = Array.isArray(data.addons) ? data.addons : [];
        if (addons.length === 0) {
            removeApplied();
            lastAddonsSignature = '';
            return;
        }
        const host = location.hostname;
        const addon = addons.find(a => a && a.enabled !== false && a.domain && domainMatches(a.domain, host));
        if (!addon) {
            removeApplied();
            lastAddonsSignature = '';
            return;
        }
        const sig = signatureOf(addon);
        if (sig === lastAddonsSignature && appliedNodes.length > 0) return;
        lastAddonsSignature = sig;
        applyFiles(addon);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }

    if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
        browser.storage.onChanged.addListener((changes, area) => {
            if (changes && ('addons' in changes)) apply();
        });
    }

    let moBusy = false;
    if (typeof MutationObserver !== 'undefined') {
        const mo = new MutationObserver(() => {
            if (moBusy) return;
            moBusy = true;
            setTimeout(() => {
                moBusy = false;
                apply();
            }, 400);
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    }
})();