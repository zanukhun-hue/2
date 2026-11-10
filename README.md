# YOUR NAME — AE-inspired portfolio

A **personal website**, styled as a compositing application's workspace and inspired by Camiedrip.com's presentation. **It is not After Effects, and you cannot edit video in it.** The app chrome, Project tree, Effects panel, tape deck and timeline are visual metaphors. Clicking items navigates the site.

> The reference website was not accessible to the site-inspection tool during this revision. This is a close stylistic reinterpretation based on the previously observed layout (AE interface, cassette preview, timeline), **not a verified pixel-for-pixel reproduction**.

## What visitors see

- **01_HOME** — large personal title, animated cassette, optional cover art, visual/audio preview.
- **02_ABOUT** — portrait photo, introduction, three small category tags.
- **03_MY_WORK** — three video previews with thumbnails. Click a card to open a video.
- **04_SOCIALS** — your Discord, TikTok, YouTube, Telegram, Instagram and personal website.
- **Project panel** and **timeline** — alternate navigation for those four sections.
- The tape deck works visually even before you supply an MP3; the page explicitly says there is **no audio attached**.
- The site works on desktop and has a compact mobile layout.

## What you need to send me to replace the placeholders

| Material | Needed | Recommended format / details | Where it appears |
| --- | --- | --- | --- |
| **Display name / nickname** | Yes | Exact spelling and case | Hero, app header and cassette |
| **Short tagline** | Yes | One short sentence, ideally up to 70 characters | Hero |
| **About text** | Yes | 2–5 sentences about yourself | About composition |
| **Portrait photo or avatar** | Yes | JPG/PNG/WEBP; ideally 1080 × 1350 or larger, portrait | About composition |
| **Cover image / artwork** | Optional | JPG/WEBP, at least 1600 × 900; optional dark/transparent design | Behind the cassette |
| **Audio preview** | Optional | MP3, ideally 20–35 seconds, content you may legally share | Cassette preview |
| **Main edit #1** | Yes for full showcase | MP4 H.264, or an accessible direct MP4 URL | Work card #1 |
| **Main edit #2** | Optional | MP4 H.264 | Work card #2 |
| **Main edit #3** | Optional | MP4 H.264 | Work card #3 |
| **Thumbnails** | Recommended | 3 JPG/PNG/WEBP images, ideally 1080 × 1350; one for each edit | Video cards |
| **Project titles** | Recommended | One title per edit | Video cards |
| **Social URLs** | Yes | Discord invite, TikTok, YouTube, Telegram, Instagram, personal site (whichever you actually use) | Socials composition |

*You do not have to send everything at once.* Leave missing entries blank to keep the placeholders.

For each video, the site currently expects an actual browser-playable **MP4** file or direct URL. A standard YouTube watch link is **not** a direct MP4 and needs a separate embed integration.

### How to add your own content

All editable text, links, and media paths are in **[site-config.js](site-config.js)**. No other code changes are necessary for standard replacements.

For example:
~~~js
brand: "MY NICK",
tagline: "VIDEO EDITOR / MOTION ARTIST",
profilePhoto: "assets/profile.webp",
artwork: "assets/cover.webp",
audioPreview: "assets/preview.mp3",
projects: [
  { title:"MY BEST EDIT", label:"EDIT_01.mp4", video:"assets/edit-01.mp4", poster:"assets/thumb-01.webp" },
  { title:"SECOND EDIT", label:"EDIT_02.mp4", video:"assets/edit-02.mp4", poster:"assets/thumb-02.webp" },
  { title:"THIRD EDIT", label:"EDIT_03.mp4", video:"assets/edit-03.mp4", poster:"assets/thumb-03.webp" }
],
socialLinks: [
  { title:"DISCORD", url:"https://discord.gg/YOUR_INVITE" },
  { title:"TIKTOK", url:"https://www.tiktok.com/@YOUR_HANDLE" }
]
~~~

Put actual image/audio/video files inside an \`assets/\` directory; the relative URL should match the filename and case exactly. If a user does not have an artwork image, the cassette still displays a designed gradient background.

**Media hosting:** GitHub warns on files over 50 MB, and blocks normal uploads of files over 100 MB. Keep MP4s compressed (ideally under 25–50 MB) or host them separately with direct playback URLs. Don't commit private files or secret keys to a public GitHub repository.

### Run and publish

Local: open \`index.html\` in a browser or serve the project with a simple static server. No npm or build steps required.

GitHub Pages:
1. Open **Settings → Pages** in the \`zanukhun-hue/2\` repository.
2. Under Build and deployment, choose **GitHub Actions** as Source.
3. The included workflow \`.github/workflows/pages.yml\` validates JS and deploys the site on pushes to \`main\`.
4. After GitHub Pages confirms a successful deployment, the expected address is \`https://zanukhun-hue.github.io/2/\`.

### Keyboard

\`1\` Home, \`2\` About, \`3\` Work, \`4\` Socials, \`Space\` toggle cassette preview, \`Esc\` close the video dialog. No editing controls.

### Credits

Original website implementation. Inspired by the look of motion-design editing software and the layout of the referenced creator microsite. Not affiliated with Adobe. No reference photos, music, videos or branding have been copied.
