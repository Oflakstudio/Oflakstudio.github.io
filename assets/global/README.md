# Global assets

Site-wide assets that are **not** tied to a single project live here (shared across the whole portfolio). Keep anything project-specific inside `assets/projects/<project>/` instead — never duplicate a file between the two.

Create these subfolders **on demand**, when the first matching asset is added (empty folders are intentionally omitted to keep the repo clean):

```
assets/global/
├─ logo/           brand logotype / brandmark, favicon, app icons
├─ icons/          shared UI icons (only if not inlined as SVG)
├─ fonts/          self-hosted webfonts (only if not loaded from Google Fonts)
├─ backgrounds/    reusable background images / textures
├─ illustrations/  shared illustrations / graphics
└─ ui/             misc shared interface assets
```

### Current state
The site presently has **no global binary assets**: UI icons are inline SVG, type is loaded from Google Fonts via `@import`, and backgrounds are CSS gradients. This folder is scaffolded for future shared assets (e.g. a favicon or OG share image, which are recommended additions).

### Rules
- Use **relative** paths in HTML/CSS/JS (e.g. `assets/global/logo/favicon.svg`) — never absolute local machine paths.
- Prefer **lowercase, hyphenated** filenames (e.g. `crea-graphix-mark.svg`).
- One source of truth per asset — do not copy the same file into multiple folders.
