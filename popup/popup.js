const DEFAULT_STANDARD_ENGINES = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q={query}" },
    { id: "duckduckgo", name: "DuckDuckGo", url: "https://duckduckgo.com/?q={query}" },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q={query}" }
];

function normalizeSettings(raw) {
    const searchEngines = Array.isArray(raw.searchEngines) && raw.searchEngines.length > 0
        ? raw.searchEngines
        : DEFAULT_STANDARD_ENGINES;
    const searchEngineId = raw.searchEngineId || raw.searchEngine || searchEngines[0]?.id || "google";

    let suffix = typeof raw.suffix === "string" ? raw.suffix : "watch";
    let searchQueryMode = raw.searchQueryMode === "title" ? "title" : "titleYear";
    let activeProfileId = raw.activeProfileId || "";
    let activeProfileName = "";

    if (raw.profiles) {
        const profile = raw.profiles[activeProfileId] || raw.profiles["imdb"];
        if (profile) {
            suffix = typeof profile.suffix === "string" ? profile.suffix : suffix;
            searchQueryMode = profile.searchQueryMode === "title" ? "title" : "titleYear";
            activeProfileName = profile.name || "";
        }
    }

    return {
        suffix,
        searchEngineId,
        searchQueryMode,
        searchEngines,
        activeProfileName
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const settings = normalizeSettings(await browser.storage.local.get(null));
        const currentEngine = settings.searchEngines.find((engine) => engine.id === settings.searchEngineId);

        document.getElementById("currentProfile").textContent = settings.activeProfileName || "IMDb";
        document.getElementById("currentEngine").textContent = currentEngine?.name || "Google";
        document.getElementById("currentQueryMode").textContent =
            settings.searchQueryMode === "title" ? "title" : "title+year";
        document.getElementById("currentSuffix").textContent = settings.suffix || "None";
    } catch (error) {
        console.error("Error loading settings:", error);
    }

    document.getElementById("openOptions").onclick = () => {
        browser.runtime.openOptionsPage();
    };

    document.getElementById("resetDefaults").onclick = async () => {
        if (confirm("Reset all settings to defaults?")) {
            await browser.storage.local.clear();
            location.reload();
        }
    };
});
