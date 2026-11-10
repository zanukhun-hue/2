# NULL OBJECT — AE-inspired personal website

Website for **Null Object** — AE plugins, motion design and edits. Inspired by Camiedrip.com's software-workspace presentation, but with original content and branding. It is a **website**, not a browser video editor.

## What is done

- The name, biography and Telegram channel are configured in [site-config.js](site-config.js).
- Home: animated cassette, NULL OBJECT branding, neon generated cover art and 35-second audio preview.
- About: the uploaded cube mascot/avatar and a short Russian description.
- My Work: three provided edits with their thumbnail images; click a work card to play the video.
- Socials: active Telegram, GitHub and original website links. Discord/TikTok/YouTube remain empty until their real URLs are provided.
- Project panel and timeline serve as navigation between the site's four sections.
- Keyboard shortcuts: **1–4** navigate, **Space** previews audio/animation, **Esc** closes a video.

## Important: upload the media archive once

The source repo contains the website code and vector image fallbacks. This chat's GitHub connector cannot directly upload large binary media. The **complete media archive is prepared** separately, ready for a single drag-and-drop upload:

**File to upload:** \`null-object-assets.zip\` (about 15.3 MB).

To finish making the site fully functional:
1. Download **null-object-assets.zip** from this conversation.
2. Open [github.com/zanukhun-hue/2](https://github.com/zanukhun-hue/2).
3. Choose **Add file → Upload files**.
4. Drag in the ZIP **as-is, without unpacking**, at the root of the repository.
5. Select **Commit changes** to \`main\`. The GitHub Pages deployment workflow detects the ZIP, extracts its \`assets/\` folder and sets the site's media-ready flag automatically.

**Do not rename the ZIP**. When it is absent, the site displays branded placeholders instead of broken images or video players. After upload, all media should be visible on the next successful Pages deployment.

### Media in the archive

| Path inside archive | Source |
|---|---|
| \`assets/null-object-cover.png\` | Generated wide neon banner based on the avatar |
| \`assets/null-object-avatar.png\` | User-provided original avatar |
| \`assets/audio-preview.mp3\` | First 35 seconds of Chyde — Broken and Cold; default on cassette |
| \`assets/audio-bratata-preview.mp3\` | Alternate preview from SELFISH — братата |
| \`assets/audio-favorit-preview.mp3\` | Alternate preview from LOVELLACE — FAVORIT |
| \`assets/work01.mp4\` | Optimized version of пе123ригоса.mp4 |
| \`assets/work02.mp4\` | Optimized version of CC_Lelouch_final_1080p_apo8(1).mp4 |
| \`assets/work03.mp4\` | Optimized version of шашлыыык 2_prob3.mp4 |
| \`assets/work01_poster.jpg\` | Thumbnail frame from edit 1 |
| \`assets/work02_poster.jpg\` | Thumbnail frame from edit 2 |
| \`assets/work03_poster.jpg\` | Thumbnail frame from edit 3 |

The original high-resolution videos are not committed; lighter MP4 versions are used for fast loading. These may contain third-party copyrighted music/footage. **Only publish media you have the rights to share publicly**.

## Configure GitHub Pages

Go to **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The included workflow [pages.yml](.github/workflows/pages.yml) deploys automatically on updates to \`main\`. After a successful deployment, the expected address is:

**https://zanukhun-hue.github.io/2/**

This URL is not guaranteed active until GitHub Pages completes deployment successfully.

## Change content

Edit [site-config.js](site-config.js). To add socials, fill in the URL of the currently empty Discord, TikTok or YouTube entry. To change songs, set \`audioPreview\` to one of the provided preview paths above. Do not commit credentials or bot tokens.

## Project structure

- \`index.html\` — markup for the portfolio and AE-style frame
- \`styles.css\` — styling / animations
- \`app.js\` — website navigation, cassette and video previews
- \`site-config.js\` — owner info and URLs
- \`media-status.js\` — default placeholder state; overridden by the deployment
- \`assets/logo-fallback.svg\` & \`assets/hero-fallback.svg\` — vector graphics used before media upload
- \`null-object-assets.zip\` — uploaded separately, compiled by Pages when present

## Attribution

Original website code; software UI visual inspiration only. Not affiliated with Adobe. No third-party reference-site artwork or audio is included.
