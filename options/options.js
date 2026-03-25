const DEFAULT_SETTINGS = {
    suffix: "watch",
    searchEngine: "google",
    customSearchUrl: "",
    customEngines: []
};

const SEARCH_ENGINES = {
    google: "https://www.google.com/search?q={query}",
    duckduckgo: "https://duckduckgo.com/?q={query}",
    bing: "https://www.bing.com/search?q={query}"
};

// Yandex domains to detect
const YANDEX_DOMAINS = [
    'yandex.com',
    'yandex.ru',
    'yandex.by',
    'yandex.kz',
    'yandex.ua',
    'yandex.com.tr',
    'ya.ru',
    'mail.ru',
    'rambler.ru'
];

document.addEventListener('DOMContentLoaded', async () => {
    const suffixInput = document.getElementById('suffix');
    const engineSelect = document.getElementById('searchEngine');
    const customUrlInput = document.getElementById('customSearchUrl');
    const customUrlGroup = document.getElementById('customUrlGroup');
    const urlPreview = document.getElementById('urlPreview');
    const yandexWarning = document.getElementById('yandexWarning');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');
    
    // Custom engines fields
    const customEngineNameInput = document.getElementById('customEngineName');
    const customEngineUrlInput = document.getElementById('customEngineUrl');
    const addCustomEngineBtn = document.getElementById('addCustomEngineBtn');
    const customEnginesList = document.getElementById('customEnginesList');

    // Load saved settings
    try {
        const result = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
        const settings = { ...DEFAULT_SETTINGS, ...result };

        suffixInput.value = settings.suffix;
        engineSelect.value = settings.searchEngine;
        customUrlInput.value = settings.customSearchUrl;

        updateCustomUrlVisibility();
        updatePreview();
        checkYandexDomain();
        renderCustomEngines(settings.customEngines || []);
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Error loading settings', 'error');
    }

    // Show/hide custom URL field
    engineSelect.addEventListener('change', () => {
        updateCustomUrlVisibility();
        updatePreview();
        checkYandexDomain();
    });

    customUrlInput.addEventListener('input', () => {
        updatePreview();
        checkYandexDomain();
    });

    // Add custom engine
    addCustomEngineBtn.addEventListener('click', async () => {
        const name = customEngineNameInput.value.trim();
        const url = customEngineUrlInput.value.trim();

        if (!name || !url) {
            showStatus('Please enter both name and URL', 'error');
            return;
        }

        if (!url.includes('{query}')) {
            showStatus('URL must contain {query} placeholder', 'error');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showStatus('URL must start with http:// or https://', 'error');
            return;
        }

        try {
            const result = await browser.storage.local.get(['customEngines']);
            const customEngines = result.customEngines || [];
            
            customEngines.push({
                id: Date.now(),
                name: name,
                url: url
            });

            await browser.storage.local.set({ customEngines });
            
            customEngineNameInput.value = '';
            customEngineUrlInput.value = '';
            
            renderCustomEngines(customEngines);
            showStatus('Search engine added successfully!', 'success');
        } catch (error) {
            console.error('Error adding search engine:', error);
            showStatus('Error adding search engine', 'error');
        }
    });

    function updateCustomUrlVisibility() {
        if (engineSelect.value === 'custom') {
            customUrlGroup.style.display = 'block';
        } else {
            customUrlGroup.style.display = 'none';
            yandexWarning.classList.remove('show');
        }
    }

    function checkYandexDomain() {
        const url = customUrlInput.value.trim().toLowerCase();
        
        if (engineSelect.value === 'custom' && url) {
            const hasYandexDomain = YANDEX_DOMAINS.some(domain => url.includes(domain));
            
            if (hasYandexDomain) {
                yandexWarning.classList.add('show');
            } else {
                yandexWarning.classList.remove('show');
            }
        } else {
            yandexWarning.classList.remove('show');
        }
    }

    function updatePreview() {
        if (engineSelect.value === 'custom' && customUrlInput.value) {
            const testQuery = "Movie Title 2024 watch";
            const url = customUrlInput.value.replace('{query}', encodeURIComponent(testQuery));
            urlPreview.textContent = `Example: ${url}`;
            urlPreview.style.display = 'block';
        } else {
            urlPreview.style.display = 'none';
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.className = 'status';
        }, 3000);
    }

    function renderCustomEngines(customEngines) {
        if (!customEnginesList) return;
        
        customEnginesList.innerHTML = '';
        
        if (customEngines.length === 0) {
            customEnginesList.innerHTML = '<div style="color: #888; padding: 10px;">No custom search engines yet</div>';
            return;
        }

        customEngines.forEach((engine, index) => {
            const engineDiv = document.createElement('div');
            engineDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 12px;
                background: #2a2a2a;
                border-radius: 4px;
                margin-bottom: 12px;
            `;

            const engineInfo = document.createElement('div');
            engineInfo.innerHTML = `
                <div style="font-weight: 600; color: #fff;">${engine.name}</div>
                <div style="font-size: 12px; color: #888; word-break: break-all;">${engine.url}</div>
            `;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.cssText = `
                background: #de3217;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-size: 12px;
                align-self: flex-start;
            `;
            deleteBtn.onclick = async () => {
                try {
                    const result = await browser.storage.local.get(['customEngines']);
                    const updated = result.customEngines.filter(e => e.id !== engine.id);
                    await browser.storage.local.set({ customEngines: updated });
                    renderCustomEngines(updated);
                    showStatus('Search engine deleted', 'success');
                } catch (error) {
                    showStatus('Error deleting search engine', 'error');
                }
            };

            engineDiv.appendChild(engineInfo);
            engineDiv.appendChild(deleteBtn);
            customEnginesList.appendChild(engineDiv);
        });
    }

    // Save settings
    saveBtn.addEventListener('click', async () => {
        const suffix = suffixInput.value.trim();
        const engine = engineSelect.value;
        const customUrl = customUrlInput.value.trim();

        // Validate custom URL
        if (engine === 'custom') {
            if (!customUrl) {
                showStatus('Please enter a custom search URL', 'error');
                return;
            }
            if (!customUrl.includes('{query}')) {
                showStatus('Custom URL must contain {query} placeholder', 'error');
                return;
            }
            if (!customUrl.startsWith('http://') && !customUrl.startsWith('https://')) {
                showStatus('URL must start with http:// or https://', 'error');
                return;
            }
        }

        try {
            await browser.storage.local.set({
                suffix: suffix,
                searchEngine: engine,
                customSearchUrl: customUrl
            });
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus('Error saving settings', 'error');
        }
    });

    // Reset to defaults
    resetBtn.addEventListener('click', async () => {
        if (confirm('Reset all settings to default values?')) {
            try {
                await browser.storage.local.set(DEFAULT_SETTINGS);
                
                suffixInput.value = DEFAULT_SETTINGS.suffix;
                engineSelect.value = DEFAULT_SETTINGS.searchEngine;
                customUrlInput.value = DEFAULT_SETTINGS.customSearchUrl;
                
                updateCustomUrlVisibility();
                yandexWarning.classList.remove('show');
                renderCustomEngines([]);
                showStatus('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                showStatus('Error resetting settings', 'error');
            }
        }
    });
});