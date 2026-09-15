# game-prompts — Game Generation Prompt Codex

> A static codex of 100 "AI game-generation prompts", each with a fixed 9-step structure
> (concept art → prototype level → game feel → experience points → signature gear → rule 1 → rule 2 → seven zones → collection system).
> Copy whole entries or individual steps, download them as plain text,
> or generate a brand-new entry from your own game document or novel-project JSON via any LLM.

🌐 [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

![game-prompts hero banner](images/Pages.jpg)

## Contents

- [Try it](#try-it)
- [Features](#features)
- [How to open](#how-to-open)
- [Novel JSON → game prompt](#novel-json--game-prompt)
- [Generate from your own document](#generate-from-your-own-document)
- [Models & API keys](#models--api-keys)
- [Project structure](#project-structure)
- [Rebuilding after edits](#rebuilding-after-edits)
- [Category overview](#category-overview)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [License](#license)

## Try it

- Just open `index.html` in a browser (pure front-end mode, nothing to install).
- After deploying to GitHub Pages, anyone can use it from a link (same pure front-end mode).

## Features

- **Search**: space-separated keywords (AND) across full text, with highlights. Press `/` or `Ctrl+K` to focus search.
- **Filter / sort / view**: category chips, favorites chip, sort dropdown (or click table headers), table/card toggle (mobile uses cards automatically).
- **Drawer**: step-by-step view (copy each step separately, tick "pasted" to track progress) / raw-text view; `←` `→` for prev/next entry, `c` to copy the whole text, `f` to favorite.
- **Shareable URLs**: `#cat=<category>&q=<keywords>&p=<slug>` restores the exact same view on reload or when shared.
- **Themes**: dark / light, follows the OS by default, toggle with 🌙／☀️ at the top right.
- **UI languages**: Traditional Chinese / English / Simplified Chinese / Japanese / Korean, switchable at the top right, auto-detected from the browser and remembered locally. Only the UI and category display names are translated; the 100 prompt bodies, slugs and category keys stay as-is, so `#cat=` links never break when switching languages.
- **Generate from a document**: paste a design document (or upload JSON, e.g. `docs/example-novel.json`), pick a model → get the 9 steps → **preview and edit** → save to the codex. The form auto-saves drafts; generation can be cancelled; requests time out after 4 minutes.
- **Model / key settings**: multiple providers (OpenRouter, OpenAI, Anthropic, Gemini, Meta, custom OpenAI-compatible endpoints). Keys live only in your browser's localStorage, with key names shared with Omni Code.
- **Data management**: list / delete custom entries, export & import custom-entry JSON, export current filtered results as Markdown, export the whole codex as JSON, clear progress and favorites.

## How to open

| Method | What you get |
| --- | --- |
| Double-click `index.html` (file://) or GitHub Pages | browse, search, favorite, copy, download; LLM results are stored in the browser and auto-downloaded as `.txt` |
| XAMPP / Apache + PHP | everything above, plus: results are really written to `prompts/*.txt`, custom entries can be deleted, and `api/relay.php` relays requests when direct browser connections are blocked |

## Novel JSON → game prompt

Want to turn your novel's world into a game pitch? Three steps:

1. **Write the novel**: sign up at [omnipd.cloud/app](https://omnipd.cloud/app) and generate a complete story novel there (characters, worldbuilding and chapter outlines are built for you).
2. **Export the JSON**: export the novel project as a JSON file in omnipd (it contains story text, character settings, chapters and similar text fields).
3. **Convert to a game prompt**: back in this codex, click "Generate" → upload that JSON file (see `docs/example-novel.json` for the expected shape) → pick a model → get a 9-step game-production prompt → preview, edit, save.

How it works: the uploaded JSON first goes through text extraction (text fields only, base64 images skipped automatically; see `gpExtractJsonText` in `assets/app-gen.js`),
then 3 same-genre reference examples (one guaranteed to share the target genre, `gpPickRefs`) are attached and sent to the LLM together.
The returned fields are assembled into the full text by `gpBuildPrompt` using the same 9-step template, so the format is guaranteed by code.

## Generate from your own document

1. Click "Generate" and paste a game design document (gameplay, characters, world — the more specific, the better), or upload a JSON file directly.
2. Pick a model (fill in an API key in key settings first).
3. Generate → wait for the LLM → edit the title, category, fields and full text on the preview page.
4. Save: with a PHP backend it writes `prompts/<slug>.txt` and rebuilds the codex; in pure front-end mode it is kept in the browser and auto-downloaded as `.txt`.

## Models & API keys

- Supports OpenRouter, OpenAI, Anthropic, Gemini, Meta AI, plus custom OpenAI-compatible endpoints.
- Keys stay in your own browser's localStorage and are never uploaded anywhere (key names are shared with Omni Code, so fill them once).
- The front end prefers direct connections to providers; when the browser blocks them via CORS, a PHP backend automatically falls back to `api/relay.php` (whitelisted provider domains, keys never touch disk).

## Project structure

```
index.html            Build artifact: assembled from _gen/template.html + data, do not edit by hand
assets/app-gen.js     LLM generation, model/key settings, data management (depends on in-page window.GP)
assets/i18n.js        5-language UI dictionary (dict) + category display names (cats); a new language = one langs entry + same key set
prompts/*.txt         100 original texts, filename = slug
docs/example-novel.json  Sample novel JSON (upload it to try the generation flow)
api/ping.php          Backend detection
api/relay.php         AI relay (whitelisted provider domains; keys never stored)
api/save_prompt.php   Writes prompts/<slug>.txt + _gen/custom.json, rebuilds index.html
api/delete_prompt.php Deletes entries inside custom.json only, rebuilds index.html
_gen/template.html    Page template (design system + main program)
_gen/data_1..4.php    100 built-in rows (18 fields each)
_gen/lib_catalog.php  PHP build: merges built-ins + customs and applies the template
_gen/build_index.js   Node build: equivalent to lib_catalog.php, use when PHP is unavailable
_gen/build_index.php  PHP CLI rebuild entry
_gen/custom.json      Custom-entry list (backend mode; already in .gitignore)
_gen/gen.php          Regenerates prompts/*.txt from data_*.php
```

## Rebuilding after edits

```bash
node _gen/build_index.js
```

Or with PHP:

```bash
php _gen/build_index.php
```

Both produce identical output (100 built-ins + `_gen/custom.json`). `index.html` references `assets/*.js` with a content hash for cache-busting, so rebuild after editing JS too. If you changed `data_*.php` contents, first run `php _gen/gen.php` to regenerate `prompts/*.txt`, then rebuild.

![Nine genres at a glance](images/3X3.jpg)

## Category overview

| Category | Count |
| --- | --- |
| Action & Adventure | 28 |
| Roguelike & RPG | 17 |
| Simulation & Management | 10 |
| Casual & Cozy | 10 |
| Strategy & Tactics | 9 |
| Narrative & Puzzle | 9 |
| Racing & Sports | 7 |
| Horror & Mystery | 6 |
| Music & Rhythm | 4 |
| **Total** | **100** |

## Deploy to GitHub Pages

1. Push this directory to a GitHub repository.
2. Repo Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder `/ (root)`.
3. Wait a few minutes; the codex opens at `https://<user>.github.io/<repo>/`.
4. Note: GitHub Pages is static hosting, so `api/*.php` never runs — that is the "pure front-end mode" in the table above: browse, search, generate (direct LLM), download all work; custom entries live in browser localStorage and are never written back to the repo. `_gen/custom.json` is already in `.gitignore` so personal data won't be pushed by accident.

## License

MIT License, see [LICENSE](LICENSE).
