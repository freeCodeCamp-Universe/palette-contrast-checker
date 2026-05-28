# Palette Contrast Checker

**Live:** https://palette-contrast-checker.freecode.camp

A browser-based tool that evaluates color palettes for WCAG 2.2 accessibility. Enter colors in any common CSS format, and the app automatically analyzes every foreground/background combination for contrast compliance.

## Features

- **Multi-format color input** — hex, RGB, HSL, and CSS named colors
- **EyeDropper support** — sample colors directly from the screen (Chrome)
- **Full palette analysis** — evaluates all N×(N-1) directional pairs
- **WCAG 2.2 classification** — normal text (AA/AAA), large text (AA/AAA), non-text UI (AA)
- **Smart suggestions** — generates accessible colors when your palette lacks AAA coverage
- **Live previews** — adjustable font, size, and preview text
- **Filtering and sorting** — find specific combinations quickly
- **Local persistence** — auto-saves work-in-progress, named palettes, and preferences
- **Import/export** — palette CSV, analysis as markdown/CSV/JSON
- **Shareable URLs** — share palettes via URL hash (no backend needed)
- **Crash recovery** — WIP saved before analysis for browser crash protection

## Usage

Open `index.html` in Chrome. No build step or server required.

To run with a local server:

```
npx serve .
```

## Development

```
npm install
npm test          # run all tests
npm run test:watch  # watch mode
```

## Tech Stack

- Vanilla JavaScript (ES modules)
- CSS custom properties (freeCodeCamp "Command-line Chic" design system)
- Vitest for unit testing
- No framework, no build step for production
- Deployed as static files to the freeCodeCamp Universe platform
