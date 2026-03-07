# Meeting Copilot Chrome Extension

A companion Chrome Extension for Meeting Copilot that helps you record meetings from Google Meet, Zoom, and Teams.

## Features

- **In-Tab Recording**: Start and stop recording directly from Meet, Zoom, or Teams. No need to switch tabs.
- **Analyze & Save**: After stopping, choose "Analyze" (AI summary) or "Save" (store without analysis). Analyze runs in the background when possible (Phase 3); the app opens with results ready. Save opens the app to complete.
- **Floating Record Button**: Adds a "Start Record" button to the bottom-left of meeting pages
- **Toolbar Popup**: Quick access to open the app or view past meetings
- **Keyboard Shortcut**: `Ctrl+Shift+M` (Windows/Linux) or `Command+Shift+M` (Mac) to open the app
- **Context Menu**: Right-click any page and choose "Record this tab with Meeting Copilot"
- **Configurable URL**: Set your app URL in extension Settings (right-click the icon → Options)

## How to Install

### Option A: Download from the app

1. Go to your Meeting Copilot app and download `chrome-extension.zip` from the dashboard or landing page.
2. Unzip the file.
3. In Chrome, go to `chrome://extensions/`.
4. Enable "Developer mode" (top right).
5. Click "Load unpacked" and select the unzipped folder.

### Option B: Build from source

1. Run `npm run build:extension` (or `APP_URL=https://your-app.run.app npm run build:extension` for production).
2. Unzip `dist/chrome-extension.zip`.
3. Load the unpacked extension in Chrome as above.

## How to Use

- **In a meeting**: Join a Google Meet, Zoom, or Teams call. Click "Start Record", select your meeting tab (check "Share tab audio"), then click "Stop" when done. Choose "Analyze" for AI summary or "Save" to store. The app opens with your recording. Hover for platform-specific tips.
- **From the toolbar**: Click the extension icon. Use "Open Copilot App" to start recording or "View Past Meetings" for your dashboard.
- **Settings**: Right-click the extension icon → Options to set your app URL if it differs from the default.
