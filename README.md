# Random List Manager

A lightweight, offline-capable web application for managing random encounter tables and loot lists for solo tabletop RPGs. Built with vanilla JavaScript, featuring tag-based filtering, weighted randomization, and local storage persistence.

## Features

- **Tab-based Organization**: Manage multiple lists (Encounters, Items, Food, etc.)
- **Weighted Random Selection**: Roll items with customizable weight values
- **Tag-based Filtering**: Search and filter items by tags
- **Limit Feature**: Cap the number of times an item can appear in rolls
- **Real-time Search**: Filter items and tags as you type
- **Unique Items**: Mark items as unique to prevent duplicate rolls
- **Reference System**: Track item sources with customizable reference formats
- **Offline First**: All data persists locally in browser storage
- **Progressive Web App**: Works offline with service worker support
- **Dark/Light Theme**: Automatic theme detection based on system preferences

## Recent Changes

### Version 1.15.1 (January 2026)

#### New Features
- **Multi-File Import**: Import multiple files sequentially with prompt between each
  - File browser now accepts multiple file selection
  - Each file is processed in order, waiting for user response (overwrite/append) before next
  - Allows batch importing of data from multiple sources

#### UI Improvements
- **Centered Prompts**: All inline prompts now display centered on screen
  - Unique item prompts centered
  - Limit tag prompts centered
  - Import conflict prompts centered
  - Better visual hierarchy and focus

#### Removals
- **Removed Autocomplete Feature**: Simplified tag editing
  - Removed tag autocomplete dropdown suggestions
  - Users can now freely edit tags without suggestions
  - Cleaner UI and reduced complexity
  - 5 autocomplete-related tests removed (159 tests now passing)

#### Technical Improvements
- Added `importQueue` for sequential multi-file processing
- Added `processNextImportFile()` method to handle queue
- Updated file input event handler to queue all selected files
- Modified import callbacks to process next file after completion
- Fixed centered positioning for all modal prompts

### Version 1.15.0 (January 2026)

#### New Features
- **Real-time Search Bar**: Added search functionality to filter items and tags simultaneously
  - Searches across item names, tags, and reference fields
  - Case-insensitive matching
  - Tag cloud updates to show only tags from matching items
  - Item table displays only matching results

- **Limit Feature**: Ability to set a limit on how many times an item can be rolled
  - Dialog prompt when adding/editing limits
  - Limit tags displayed as simply "limit" in tag cloud (not "limit=n")
  - Items with limit=0 are excluded from roll candidates
  - Limits persist when saving items

- **Enhanced UI**
  - Search input field with focus styling and placeholder text
  - Tag cloud now responsive to search and tag filters
  - Improved modal styling for Tools and Tips & Tricks menus
  - Reference column text displayed in uppercase for consistency

- **Tips & Tricks Modal**: Comprehensive help documentation accessible from menu
  - Full-screen modal matching Tools menu styling
  - Includes best practices and usage guidelines

#### Bug Fixes
- Fixed e2e test failures (164 tests now passing)
- Fixed case sensitivity mismatches in test selectors
- Corrected search filtering to work alongside tag filters
- Improved tag cloud filtering to reflect current search term
- Fixed renderList() to always apply filters (search + tags) correctly

#### Technical Improvements
- Added search term variable and event listeners
- Modified renderTagCloud() to filter items before extracting tags
- Updated renderList() to use filtered results consistently
- Enhanced getFilteredList() to apply search filtering before tag filtering
- Improved event delegation and DOM manipulation

### Version 1.14.0 (Previous)

#### Features
- Tab-based list management
- Weighted randomization with roll logging
- Tag-based filtering and unique item support
- Reference field with legend table
- Offline persistence with localStorage
- Tools and Tips menus (now full-screen modals)

## How It Works

### Adding Items
1. Enter an item name in the input field
2. Click "Add Item" or press Enter
3. Items appear in the table with editable fields
4. Edit inline by clicking on name, tags, reference, or weight fields

### Using Tags
- Add multiple tags separated by commas
- Special tag `unique` prevents duplicate rolls
- Use `limit=n` to cap rolls (e.g., `limit=3` allows up to 3 rolls)

### Rolling
1. Select items or tags to filter candidates
2. Click "Roll!" to randomly select an item
3. View roll history in the log
4. Copy results to clipboard

### Searching
1. Type in the search bar to filter items in real-time
2. Results update for both the item table and tag cloud
3. Search works across item names, tags, and reference fields
4. Clear search to see all items again

## Data Structure

Items are stored with the following structure:
```javascript
{
  name: "Item Name",
  tags: "tag1, tag2, unique, limit=5",
  reference: "DBR 42",
  weight: 50
}
```

## Browser Support

- Modern browsers with ES6+ support
- Chrome/Edge (recommended)
- Firefox
- Safari

## Offline Usage

The app includes a service worker for offline functionality. First visit must be online to cache resources; subsequent visits work offline.

## License

Created for solo tabletop RPG gaming.