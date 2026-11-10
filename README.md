# AE WORKSPACE — personal creator website

An unofficial, interactive After Effects–inspired portfolio microsite. Inspired by the visual language of professional compositing applications; not affiliated with Adobe.

## Live preview

Publish with GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**.

## Features
- Docked Project / Composition / Properties / Timeline panels, with drag-resizable sidebars and timeline.
- Editable visual layers; text, solids, and shapes. Drag objects in the canvas.
- Timeline playback, scrubbing, keyframe creation and interpolation, layer selection, show/hide/lock/solo, reorder via drag and drop.
- Import images into a composition; export/import projects as JSON.
- Local project autosave.
- A dedicated creator/about/socials view, for a Discord invite and Telegram.

## Change your personal links

Edit `site-config.js`, specifically `name`, `tagline`, `discord`, `telegram`, and `github`. The Discord link is intentionally empty until the creator supplies a real invite URL. Avoid putting secrets or access tokens into this file.

## Usage
Open `index.html`, or serve the folder with any static server. No build tools needed.

## Keyboard controls
- **Space** playback/pause
- **← / →** move one frame (Shift: 10 frames)
- **T** new text layer
- **S** new shape layer
- **Delete** remove selected layer
- **Ctrl/Cmd + S** save project JSON
- **Esc** close dialogs

## Legal
This is an original interface inspired by digital compositing tools and is not a copy of any proprietary application. Adobe After Effects is a trademark of Adobe Inc.