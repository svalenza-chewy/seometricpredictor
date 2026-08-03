# SEO Metric Predictor Rebuild Package

This folder is a portable copy of the tool so you can drop it into another project and recreate the same app, now with a quarterly roadmap builder layered under the existing project catalog.

## Public Pages build

The GitHub Pages version is intended for team sharing and runs in benchmark/manual mode:

- bundled page-type benchmark data is available in the browser
- roadmap builder, cataloging, forecasting, exports, and manual overrides work
- live Conductor connection does not run on GitHub Pages because it requires a local backend session

For live Conductor credentials and API access, use the local backend below.

## Files included

- `index.html`
- `app.js`
- `styles.css`
- `server.mjs`
- `package.json`
- `AGENTS.md`
- `benchmarks/` with all page-type CSV benchmark files

## How to run

Preferred on this machine:

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:8000
```

Node still works if you have it installed:

```bash
node server.mjs
```

Then open:

```text
http://127.0.0.1:8000
```

## Important setup notes

- This package is self-contained for page-type benchmark files because `server.mjs` now reads the CSVs from `./benchmarks/`.
- The app does not store Conductor credentials. Users enter API key and secret API key in the UI.
- Current market share may still be unavailable if the user lacks Conductor Data API 2.0 entitlement.
- Saved forecast cards can now be cataloged by page type and independently assigned to upcoming roadmap quarters with quarter-level metric rollups.

## Benchmarks included

- `benchmarks/PLP Metrics.csv`
- `benchmarks/Homepage Metrics.csv`
- `benchmarks/PDP Metrics.csv`
- `benchmarks/Brands Metrics.csv`
- `benchmarks/UGC Metrics.csv`
- `benchmarks/Deals Metrics.csv`
- `benchmarks/HVSP Metrics.csv`
- `benchmarks/Shelters Metrics.csv`
- `benchmarks/Superlative Metrics.csv`
- `benchmarks/Education Metrics.csv`
- `benchmarks/Facet Metrics.csv`
