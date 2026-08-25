#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   CREA GRAPHIX — Portfolio content sync
   ---------------------------------------------------------------------
   Zero-dependency Node script (built-in fs/path only — no npm install).

   WHAT IT DOES
   Scans your asset folders and merges them with your curated
   `content.config.json`, then writes `content.js` which the website
   reads. This means:

     • Drop a NEW certificate image into assets/certificates/  → it shows up.
     • Drop a NEW project folder into assets/projects/          → it shows up.
     • Swap the hero photo name in content.config.json          → it updates.

   Existing projects stay CURATED: their image list lives in
   content.config.json (edit the `media` array to show more/fewer).
   Brand-new project folders auto-include their images so nothing is lost.

   USAGE
     node sync.js            → sync once
     node sync.js --watch    → sync now, then keep watching for changes
     node sync.js --quiet    → less console output

   You normally never run this by hand — just double-click
   "Sync-Portfolio" (Windows) or "sync.command" (Mac). See README-SYNC.md.
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'content.config.json');
const OUTPUT_PATH = path.join(ROOT, 'content.js');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];
const MEDIA_EXT = IMAGE_EXT.concat(VIDEO_EXT);

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const QUIET = args.includes('--quiet');

/* ── tiny console helpers (no colour deps; plain, universal) ── */
const log = (...a) => { if (!QUIET) console.log(...a); };
const warn = (...a) => console.warn('  ! ', ...a);
const stamp = () => new Date().toLocaleTimeString();

/* ── filesystem helpers ─────────────────────────────────────── */
function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith('.'))
      .map((d) => d.name);
  } catch (_) { return []; }
}
function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name);
  } catch (_) { return []; }
}
/* recursively collect media files under a folder, returned as paths
   RELATIVE to that folder (POSIX separators for the web) */
function listMediaRecursive(absDir, relBase = '') {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const rel = relBase ? relBase + '/' + e.name : e.name;
    if (e.isDirectory()) {
      out = out.concat(listMediaRecursive(path.join(absDir, e.name), rel));
    } else if (e.isFile() && MEDIA_EXT.includes(path.extname(e.name).toLowerCase())) {
      out.push(rel);
    }
  }
  return out;
}
const exists = (p) => { try { return fs.existsSync(p); } catch (_) { return false; } };
const isImage = (f) => IMAGE_EXT.includes(path.extname(f).toLowerCase());
const isVideo = (f) => VIDEO_EXT.includes(path.extname(f).toLowerCase());
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/* ── text helpers ───────────────────────────────────────────── */
function prettyName(filename) {
  const base = filename.replace(/\.[^.]+$/, '');            // strip extension
  return base
    .replace(/[_\-]+/g, ' ')                                 // _ - → space
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}
function prettyFolder(folder) {
  return prettyName(folder.replace(/^\s*\d+\s+/, ''));       // drop leading "NN "
}
function slugify(folder) {
  return folder
    .replace(/^\s*\d+\s+/, '')                               // drop leading "NN "
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ── load config ────────────────────────────────────────────── */
function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

/* ── build certificates array ───────────────────────────────── */
function buildCertificates(cfg, counters) {
  const c = cfg.certificates || {};
  const folder = c.folder || 'assets/certificates';
  const meta = c.meta || {};
  const order = Array.isArray(c.order) ? c.order : [];
  const absFolder = path.join(ROOT, folder);

  const onDisk = listFiles(absFolder).filter(isImage);
  const onDiskSet = new Set(onDisk);

  // curated order first (only those still on disk), then any new files
  const ordered = order.filter((f) => onDiskSet.has(f));
  const known = new Set(ordered);
  const extras = onDisk.filter((f) => !known.has(f)).sort(naturalSort);
  if (extras.length) { counters.newCerts += extras.length; extras.forEach((f) => log('   + new certificate:', f)); }
  // warn about curated entries whose file is gone
  order.filter((f) => !onDiskSet.has(f)).forEach((f) => warn('certificate in config not found on disk (skipped):', f));

  const finalOrder = ordered.concat(extras);
  return finalOrder.map((file) => {
    const m = meta[file] || {};
    const name = m.name || prettyName(file);
    const issuer = m.issuer || '';
    const date = m.date || '';
    const alt = m.alt || (name + (issuer ? ' — ' + issuer : '') + ' certificate');
    return { file: folder + '/' + file, name, issuer, date, alt };
  });
}

/* ── build one auto-generated (uncurated) project ───────────── */
function buildAutoProject(folder, projectsFolderRel, cap, counters) {
  const abs = path.join(ROOT, projectsFolderRel, folder);
  let files = listMediaRecursive(abs).sort(naturalSort);
  if (cap > 0 && files.length > cap) files = files.slice(0, cap);
  const media = files.map((f) => ({
    type: isVideo(f) ? 'video' : 'image',
    src: projectsFolderRel + '/' + folder + '/' + f,
    caption: prettyName(path.basename(f)),
  }));
  const label = prettyFolder(folder);
  counters.newProjects += 1;
  log('   + new project folder:', folder, '(' + media.length + ' media auto-included)');
  return {
    slug: slugify(folder) || ('project-' + Math.random().toString(36).slice(2, 7)),
    category: 'branding',
    card: {
      tag: label,
      name: label,
      desc: 'New project — add details in content.config.json.',
      thumb: media.length ? media[0].src : '',
      alt: label,
    },
    tag: label,
    title: label,
    summary: '',
    meta: {},
    story: {},
    media,
  };
}

/* ── build one curated project (validate media exist) ───────── */
function buildCuratedProject(folder, item) {
  // media src paths in config are RELATIVE TO THE SITE ROOT (e.g.
  // "assets/projects/<slug>/gallery/file.png"), so validate against ROOT.
  const media = (item.media || []).filter((m) => {
    const ok = exists(path.join(ROOT, m.src));
    if (!ok) warn('project "' + folder + '" media not found (skipped):', m.src);
    return ok;
  });
  // thumb fallback if the curated thumbnail is missing
  let thumb = (item.card && item.card.thumb) || '';
  if (thumb && !exists(path.join(ROOT, thumb))) {
    warn('project "' + folder + '" thumbnail not found, using first media:', thumb);
    thumb = media.length ? media[0].src : '';
  }
  return {
    slug: item.slug || slugify(folder),
    category: item.category || 'branding',
    card: {
      tag: (item.card && item.card.tag) || prettyFolder(folder),
      name: (item.card && item.card.name) || prettyFolder(folder),
      desc: (item.card && item.card.desc) || '',
      thumb,
      alt: (item.card && item.card.alt) || ((item.card && item.card.name) || prettyFolder(folder)),
    },
    tag: item.tag || '',
    title: item.title || prettyFolder(folder),
    summary: item.summary || '',
    meta: item.meta || {},
    story: item.story || {},
    media,
  };
}

/* ── build projects (curated + auto), preserving order ──────── */
function buildProjects(cfg, counters) {
  const p = cfg.projects || {};
  const folder = p.folder || 'assets/projects';   // parent dir; each child folder = one project
  const galRoot = path.join(ROOT, folder);
  const items = p.items || {};
  const order = Array.isArray(p.order) ? p.order : [];
  const cap = (p.defaults && Number(p.defaults.autoIncludeMediaCap)) || 8;

  const onDisk = listDirs(galRoot);
  const onDiskSet = new Set(onDisk);

  // curated order first (that still exist), then any new folders
  const ordered = order.filter((f) => onDiskSet.has(f));
  const known = new Set(ordered);
  const extras = onDisk.filter((f) => !known.has(f)).sort(naturalSort);
  order.filter((f) => !onDiskSet.has(f)).forEach((f) => warn('project folder in config not found on disk (skipped):', f));

  const projects = {};
  const projectOrder = [];
  const finalFolders = ordered.concat(extras);

  for (const f of finalFolders) {
    const built = items[f]
      ? buildCuratedProject(f, items[f])
      : buildAutoProject(f, folder, cap, counters);
    if (projects[built.slug]) {
      warn('duplicate slug "' + built.slug + '" — folder "' + f + '" skipped to avoid collision');
      continue;
    }
    projects[built.slug] = {
      category: built.category,
      card: built.card,
      tag: built.tag,
      title: built.title,
      summary: built.summary,
      meta: built.meta,
      story: built.story,
      media: built.media,
    };
    projectOrder.push(built.slug);
  }
  return { projects, projectOrder, projectFolder: folder };
}

/* ── build profile (hero photo) ─────────────────────────────── */
function buildProfile(cfg) {
  const pr = cfg.profile || {};
  const folder = pr.photoFolder || 'assets/profile';
  const absFolder = path.join(ROOT, folder);
  let hero = pr.heroPhoto || '';
  if (!hero || !exists(path.join(absFolder, hero))) {
    const imgs = listFiles(absFolder).filter(isImage).sort(naturalSort);
    if (imgs.length) {
      if (hero) warn('hero photo "' + hero + '" not found, using', imgs[0]);
      hero = imgs[0];
    }
  }
  return {
    heroPhoto: hero ? folder + '/' + hero : '',
    heroObjectPosition: pr.heroObjectPosition || '50% 30%',
  };
}

/* ── one full build ─────────────────────────────────────────── */
function build() {
  const counters = { newCerts: 0, newProjects: 0 };
  let cfg;
  try { cfg = loadConfig(); }
  catch (e) {
    console.error('\n  ✖ Could not read content.config.json — ' + e.message + '\n');
    return false;
  }

  const certificates = buildCertificates(cfg, counters);
  const { projects, projectOrder, projectFolder } = buildProjects(cfg, counters);
  const profile = buildProfile(cfg);

  const data = {
    generatedAt: new Date().toISOString(),
    projectFolder,
    profile,
    certificates,
    projectOrder,
    projects,
  };

  const banner =
    '/* ═══════════════════════════════════════════════════════════\n' +
    '   AUTO-GENERATED by sync.js — DO NOT EDIT BY HAND.\n' +
    '   Edit content.config.json, then re-run Sync-Portfolio.\n' +
    '   Generated: ' + data.generatedAt + '\n' +
    '   ═══════════════════════════════════════════════════════════ */\n';
  const body = 'window.SITE_CONTENT = ' + JSON.stringify(data, null, 2) + ';\n';

  try { fs.writeFileSync(OUTPUT_PATH, banner + body, 'utf8'); }
  catch (e) { console.error('  ✖ Could not write content.js — ' + e.message); return false; }

  log('  ✔ content.js written  ·  ' +
      projectOrder.length + ' projects, ' +
      certificates.length + ' certificates, hero: ' + (profile.heroPhoto || '(none)'));
  if (counters.newCerts || counters.newProjects) {
    log('    (' + counters.newCerts + ' new certificate(s), ' + counters.newProjects + ' new project(s) picked up automatically)');
  }
  return true;
}

/* ── watch mode ─────────────────────────────────────────────── */
function startWatch(cfg) {
  const targets = [
    CONFIG_PATH,
    path.join(ROOT, (cfg.certificates && cfg.certificates.folder) || 'assets/certificates'),
    path.join(ROOT, (cfg.projects && cfg.projects.folder) || 'assets/projects'),
    path.join(ROOT, (cfg.profile && cfg.profile.photoFolder) || 'assets/profile'),
  ];
  let timer = null;
  const trigger = (why) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      log('\n[' + stamp() + '] change detected (' + why + ') — re-syncing…');
      build();
    }, 350);
  };
  for (const t of targets) {
    try {
      // recursive works on Windows & macOS; fall back to shallow elsewhere
      let opts = { persistent: true };
      try { fs.watch(t, { persistent: true, recursive: true }, () => trigger(path.basename(t))); }
      catch (_) { fs.watch(t, opts, () => trigger(path.basename(t))); }
    } catch (e) { warn('cannot watch', path.basename(t), '-', e.message); }
  }
  log('\n  👀 Watching for changes… drop files into your folders and they appear automatically.');
  log('     (Leave this window open. Press Ctrl+C to stop.)\n');
}

/* ── main ───────────────────────────────────────────────────── */
(function main() {
  log('\n  CREA GRAPHIX — portfolio sync');
  log('  ─────────────────────────────');
  const ok = build();
  if (!ok) { process.exitCode = 1; return; }
  if (WATCH) {
    try { startWatch(loadConfig()); }
    catch (e) { console.error('  ✖ watch failed:', e.message); }
  } else {
    log('\n  Done. You can close this window.\n');
  }
})();
