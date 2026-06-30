---
name: spin-up
description: Serve the palette-contrast-checker app locally to view or verify changes in a browser. Use when asked to "spin it up", run/start/serve the app, or manually check a change in the real UI.
---

# Spin up the app locally

This is a **static site** — plain HTML/CSS/ES modules with no build step. Just
serve the repo root over HTTP (opening `index.html` via `file://` breaks the ES
module imports, so a server is required).

## Start the server

Serve the repo root in the background on a fixed port:

```bash
python3 -m http.server 8123 --bind 127.0.0.1
```

Run it with `run_in_background: true`. Then confirm it's up:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8123/index.html   # expect 200
```

Give the user the URL: **http://127.0.0.1:8123/index.html**

If port 8123 is taken, pick another (8124, 8080, …) and adjust the URL.

## Verifying common things

- **Run the analysis**: paste colors into the palette editor and click *Analyze*.
- **Trigger an alert banner** (`#alerts-container`): analyze a palette that
  leaves a role/contrast level uncovered — the missing-coverage info alert
  renders via `js/ui/alerts.js`.
- **Logic/units**: prefer `npm test` (vitest, jsdom) — most behavior is covered
  there and doesn't need the browser.

## When done

Stop the background server (TaskStop on the background task, or kill the
`http.server` process). Ask the user before shutting it down if they may still
be looking at it.
