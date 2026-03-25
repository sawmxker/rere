const DEFAULT_SETTINGS = {
    suffix: "watch",
    searchEngine: "google",
    customSearchUrl: ""
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
                showStatus('Settings reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                showStatus('Error resetting settings', 'error');
            }
        }
    });
});