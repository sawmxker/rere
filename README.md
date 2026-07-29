# reré: Quick ReSearching

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="reré logo">
</p>

<p align="center">
  <strong>Adds convenient search buttons to IMDb, MyAnimeList, and Goodreads for quick research on any resources you prefer.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/manifest-json/v/sawmxker/rere?filename=manifest.json&label=Version&color=0A1F44" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/platform-Firefox-orange.svg" alt="Platform">
</p>

---

## Overview

**reré** is a lightweight and functional browser extension that saves you time when browsing IMDb, MyAnimeList, and Goodreads.

It adds a quick search button directly to movie, TV show, anime, manga, and book pages, allowing you to instantly navigate to your favorite resources: streaming sites, trackers, databases, or forums.

---

## Features

- Quick search from **IMDb**, **MyAnimeList**, and **Goodreads** by title on your preferred resources
- Profile system — separate search configurations for IMDb, MAL Anime, MAL Manga, and Goodreads
- Per-site enable toggles and custom button labels
- Context menu search — right-click selected text on any page
- Customizable search parameters with your own search engines and suffixes
- Export/import settings via JSON file or encoded link
- Drag-and-drop reordering of search engines and menu items
- Icon picker for custom favicons per search engine
- Collapsible sections for cleaner settings layout
- Firefox Sync support
- MAL Quick Link (Jikan API) — get direct MAL page links from other sites
- MAL dark mode support
- Minimalistic and unobtrusive interface

---

## Installation

Install the extension from the official Firefox Add-ons store:

https://addons.mozilla.org/ru/firefox/addon/rer%C3%A9-imdb-quick-researching/

or see the Development block below

---

## Usage

### On IMDb page
1. Open any IMDb page for a movie, TV series, game, etc.
2. Click the Search button for a quick search. A new tab will open with the title from the page + year + query suffix.
3. Click the drop-down list to the right of the button. Select the item you prefer from the Quick Search Menu.

### On MyAnimeList page
1. Open any anime (`/anime/`) or manga (`/manga/`) page.
2. Click the "reré: search" button. A new tab will open with the title + year + query suffix.
3. Click the drop-down list to the right of the button for the Quick Search Menu.

### On Goodreads page
1. Open any book page.
2. Click the "reré: search" button. A new tab will open with the title + year + query suffix.
3. Click the drop-down list to the right of the button for the Quick Search Menu.

### Context menu
1. Select any text on any page.
2. Right-click and choose "reré:Search".
3. Pick a profile, then a search engine.

### Settings
1. Open Settings.
2. Create profiles for IMDb, MAL Anime, MAL Manga, or Goodreads.
3. Add Default Search Engines; they will open when you click the Search button.
   example: `https://www.perplexity.ai/search/?q={query}`
4. Add Quick Search Menu Items; they will be available in the dropdown.
   example: `https://www.google.com/search?q=site:myanimelist.net+{query}&btnI`
5. Configure per-site toggles, button labels, title modes, and more in Additional Settings.
6. Drag to reorder engines and menu items. Click an engine icon to change it.

---

## Permissions

The extension requires the following minimum permissions to function correctly:

- Access to the contents of IMDb, MyAnimeList, and Goodreads pages to detect titles and add search buttons.
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
