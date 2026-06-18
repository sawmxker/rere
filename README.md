# reré: Quick ReSearching

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="reré logo">
</p>

<p align="center">
  <strong>Adds convenient search buttons to IMDb and MyAnimeList for quick research on any resources you prefer.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/manifest-json/v/sawmxker/rere?filename=manifest.json&label=Version&color=0A1F44" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/platform-Firefox-orange.svg" alt="Platform">
</p>

---

## Overview

**reré** is a lightweight and functional browser extension that saves you time when browsing IMDb and MyAnimeList.

It adds a quick search button directly to movie, TV show, anime, and manga pages, allowing you to instantly navigate to your favorite resources: streaming sites, trackers, anime databases, or forums.

---

## Features

- Quick search from IMDb and MyAnimeList by title on your preferred resources
- Profile system — separate search configurations for IMDb, MAL Anime, and MAL Manga
- Per-site enable toggles and custom button labels
- Context menu search — right-click selected text on any page
- Customizable search parameters with your own search engines and suffixes
- Export/import settings via JSON file or encoded link
- Drag-and-drop reordering of search engines and menu items
- Minimalistic and unobtrusive interface
- Supports MAL dark mode

---

## Installation

Install the extension from the official Firefox Add-ons store:

https://addons.mozilla.org/ru/firefox/addon/rer%C3%A9-imdb-quick-researching/

or see the Development block below

---

## Usage

### On IMDb page
1. Open any IMDb page for a movie, anime, TV series, game, etc.
2. Click the Search button for a quick search. A new tab will open with the title from the page + year + query suffix.
3. Click the drop-down list to the right of the button. Select the item you prefer from the Quick Search Menu.

### On MyAnimeList page
1. Open any anime (`/anime/`) or manga (`/manga/`) page.
2. Click the "reré: search" button. A new tab will open with the title + year + query suffix.
3. Click the drop-down list to the right of the button for the Quick Search Menu.

### Context menu
1. Select any text on any page.
2. Right-click and choose "reré:Search".
3. Pick a profile, then a search engine.

### Settings
1. Open Settings.
2. Create profiles for IMDb, MAL Anime, or MAL Manga.
3. Add Default Search Engines; they will open when you click the Search button.
   example: `https://www.perplexity.ai/search/?q={query}`
4. Add Custom Search Engines; they will be available in the Quick Search Menu.
   example: `https://www.google.com/search?q=site:myanimelist.net+{query}&btnI`
5. Configure per-site toggles and button labels in Additional Settings.
6. Drag to reorder engines and menu items.

---

## Permissions

The extension requires the following minimum permissions to function correctly:

- Access to the contents of IMDb and MyAnimeList pages to detect titles and add search buttons.
- Ability to open new tabs with search queries when you click the buttons.
- Storage access to save your custom search templates, profiles, and preferences.
- Context menu integration for right-click search on any page.
- Access to browser tabs information to integrate with the current tab and manage popup interactions.

All permissions are used only to provide the core functionality of the extension and do not collect or transmit your browsing data.

---

## Development

Clone the repository:

```bash
git clone https://github.com/sawmxker/rere.git
```

Run locally in Firefox:

1. Open `about:debugging`,
2. Navigate to "This Firefox",
3. Click Load Temporary Add-on,
4. Select the manifest.json file.
