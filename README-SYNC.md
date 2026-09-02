# Keeping your portfolio up to date

Your site is **static** (plain HTML/CSS/JS, no build step), but you don't have to touch
code to update it. A small helper reads your asset folders plus one config file and
regenerates the data the site displays.

## The one-minute version

1. **Add your file** to the right folder:
   - New certificate → `assets/certificates/`
   - New project → create `assets/projects/<your-project>/gallery/` and put the images/videos inside
   - New profile photo → `assets/profile/`
   - More images for an existing project → drop them into that project's `selected/` folder (see below)
2. **Sync** — double-click **`Sync-Portfolio.bat`** (Windows) or **`sync.command`** (macOS).
3. **Refresh** the website. Done.

Anything _new_ — new certificates and new project folders — is picked up automatically.

## Adding images to a project that's already on the site

Every project can have a **`selected/`** folder — the easy, no-code way to choose what shows:

```
assets/projects/<project-name>/selected/
```

Put the images and videos you want on display **inside `selected/`** and they appear on the
site automatically — in file-name order, with captions made from the file names. Keep your
full archive in the project's `gallery/` folder; only what's in `selected/` gets published.

- **Order** them by prefixing numbers: `01 hero.jpg`, `02 detail.png` (the number is dropped
  from the caption).
- **Caption** = the tidied-up file name. Rename a file to change its caption.
- **Thumbnail** = the project's set thumbnail if it still exists, otherwise the first item.
- If a project has **no `selected/` folder** (or it's empty), nothing changes — it keeps
  showing exactly what it shows today. So this is opt-in, per project.

Then save — if `Sync-Watch` is running it updates instantly; otherwise double-click
`Sync-Portfolio` once.

## Curating what shows (optional)

`content.config.json` is the **single source of truth** for wording and curation. Open it
in any text editor to:

- set a project's **title, tag, description, and case-study story**;
- choose **which images/videos** appear in a project (the `media` list) and the **thumbnail** — though the `selected/` folder above is the easier, no-editing way to pick images;
- set the **hero photo** (`profile.heroPhoto`) and its framing (`profile.heroObjectPosition`);
- add **certificate details** (issuer, date) under `certificates.meta`.

After editing, run the sync again.

> **Why a config?** A browser can't list the contents of a folder from a local file, so the
> sync step "bakes" your folders and choices into `content.js`, which the page then reads
> instantly with zero dependencies.

## What NOT to edit

- **`content.js`** — generated automatically. Any hand edits are overwritten on the next
  sync. Edit `content.config.json` instead.

## Automatic updates (watch mode)

Don't want to run the sync each time? Double-click **`Sync-Watch.bat`** (Windows) or
**`sync-watch.command`** (macOS) once and leave the window open. Every time you add or
rename a file in an asset folder, `content.js` updates by itself within a second. Close
the window (or press Ctrl+C) to stop.

Prefer a terminal? `node sync.js --watch` does the same thing.

## Requirements

- [Node.js](https://nodejs.org) version 18 or newer. The launchers check for it and tell
  you if it's missing.
- **No `npm install`** — the script uses only Node's built-in modules.

## Troubleshooting

- **"node is not recognized" / "command not found"** → install Node.js, then run the launcher again.
- **A new project folder didn't show up** → make sure its images live inside a `gallery/`
  subfolder, and that you ran the sync.
- **An image is missing on the site** → the sync prints a warning naming any file the config
  references but can't find on disk; check the path and spelling.
- **macOS blocks `sync.command` the first time** → right-click it → **Open** (to clear Gatekeeper).
