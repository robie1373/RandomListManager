# GitHub Pages Deployment Guide

## Setup Instructions

### 1. Push Your Code to GitHub

First, if you haven't already, create a GitHub repository and push this code:

```bash
git add .
git commit -m "Add GitHub Pages configuration"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to your GitHub repository settings
2. Navigate to **Settings → Pages**
3. Under "Source", select:
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
4. Click **Save**

Your site will be published at: `https://username.github.io/RandomListManager/`

### 3. What's Included

✅ **manifest.json** - PWA configuration for installable web app
✅ **sw.js** - Service Worker for offline functionality  
✅ **GitHub Actions** - Automatic deployment on every push
✅ **Dark/Light Mode** - Already supports theme switching
✅ **Mobile Optimized** - Responsive design and touch-friendly

### 4. Features Available

#### Progressive Web App (PWA)
- Install as app on mobile or desktop
- Works offline with cached data
- Native-like experience

#### Auto-Deploy on Push
- Changes automatically deployed when you push to GitHub
- No manual steps needed after initial setup

#### Service Worker Caching
- App loads instantly from cache
- Updates automatically when online
- Fallback messaging when offline

## Usage

### Install on Desktop
1. Open the app at `https://username.github.io/RandomListManager/`
2. Click the install icon in your browser's address bar
3. Click "Install"

### Install on Mobile
1. Open in Safari (iOS) or Chrome (Android)
2. Look for "Add to Home Screen" option
3. Tap to install

### Data Storage
Your data is stored locally in the browser and persists across sessions. Export data to back it up:
1. Click **Tools → Export Data**
2. Save the downloaded JSON file safely

## Troubleshooting

**App not updating?**
- Clear your browser cache
- Uninstall and reinstall the app
- Service Worker updates automatically in the background

**GitHub Pages not showing?**
- Wait a few minutes for the initial deployment
- Check that you're on the correct branch (main/master)
- Verify Pages is enabled in repository settings

**Service Worker not working?**
- Check browser console for errors
- Service Worker requires HTTPS (GitHub Pages provides this)
- Works best in modern browsers (Chrome, Firefox, Safari, Edge)

## Next Steps

1. Test the app at your GitHub Pages URL
2. Share the link with users
3. Export/import data as needed
4. Updates are deployed automatically on git push

---

**Need help?** Visit [GitHub Pages documentation](https://docs.github.com/en/pages)
