# reré: IMDb Quick ReSearching

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="reré logo">
</p>

<p align="center">
  <strong>Adds convenient IMDb search buttons for quick research on any resources you prefer.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/manifest-json/v/sawmxker/rere?filename=manifest.json&label=Version&color=0A1F44" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/platform-Firefox-orange.svg" alt="Platform">
</p>

---

## Overview

**reré** is a lightweight and functional browser extension that saves you time when browsing IMDb.

It adds a quick search button directly to a movie or TV show page, allowing you to instantly navigate to your favorite resources: streaming sites, trackers, anime databases, or forums.

---

## Features

- Quick search from IMDb by title on your preferred resources
- Customizable search parameters with the addition of your own search engines and suffixes
- Minimalistic and unobtrusive interface
- Works on most websites with a search function
- Designed for quick search queries

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

### Settings
1. Open Settings.
2. Add Default Search Engines; they will open when you click the Search button.
example: ```https://www.perplexity.ai/search/?q={query}```
3. Add Custom Search Engines; they will be available in the Quick Search menu.
example of complex queries (searching a specific site, performing a Google search for the site + query + clicking the first link in the Google search results using the "I'm Feeling Lucky" feature): ```https://www.google.com/search?q=site:myanimelist.net+{query}&btnI```


---

## Permissions

The extension requires the following minimum permissions to function correctly:

- Access to the contents of IMDb pages to detect movie/TV show titles and add search buttons.  
- Ability to open new tabs with search queries (for example, to Google, DuckDuckGo, etc.) when you click the buttons.  
- Storage access to save your custom search templates and preferences (if enabled).  
- Access to browser tabs information in order to integrate with the current IMDb tab and manage popup interactions.  

All permissions are used only to provide the core functionality of the extension and do not collect or transmit your browsing data.

---

## Development

Clone the repository:

```bash
git clone https://github.com/sawmxker/rere.git
```

Run locally in Firefox:

1. Open ```about:debugging```,
2. Navigate to "This Firefox",
3. Click Load Temporary Add-on,
4. Select the manifest.json file.
