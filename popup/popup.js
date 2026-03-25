document.addEventListener('DOMContentLoaded', async () => {
    const DEFAULT_SETTINGS = {
        suffix: "watch",
        searchEngine: "google",
        customSearchUrl: ""
    };

    try {
        const result = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
        const settings = { ...DEFAULT_SETTINGS, ...result };

        document.getElementById('currentEngine').textContent = 
            settings.searchEngine.charAt(0).toUpperCase() + settings.searchEngine.slice(1);
        document.getElementById('currentSuffix').textContent = settings.suffix || 'None';
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    document.getElementById('openOptions').onclick = () => {
        browser.runtime.openOptionsPage();
    };

    document.getElementById('resetDefaults').onclick = async () => {
        if (confirm('Reset all settings to defaults?')) {
            await browser.storage.local.clear();
            location.reload();
        }
    };
});