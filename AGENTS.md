# SEO Metric Predictor Notes

## Project layout

- Main local prototype files live in this folder:
  - `index.html`
  - `app.js`
  - `styles.css`
  - `server.mjs`
  - `server.py` (older Python backend, no longer preferred)
- A cloned copy of the Chewy repo also exists here:
  - `conductor/`

## Preferred run command

Use Node, not Python:

```bash
cd "/Users/svalenza/Documents/Dog Friendly/ChatGPT Custom/SEO Metric Predictor"
/Users/svalenza/.local/bin/node server.mjs
```

Then open:

```text
http://127.0.0.1:8000
```

## Data sources

### Conductor live data

The UI calls the local backend in `server.mjs`, and that backend calls Conductor.

Reporting API endpoints used:

- `/v3/accounts`
- `/v3/accounts/{accountId}/web-properties`
- `/v3/accounts/{accountId}/categories`
- `/v3/accounts/{accountId}/web-properties/{webPropertyId}/tracked-searches`
- web property search volume report URLs returned by Conductor

Data API endpoint attempted:

- `/data-api/v1/async/keyword_rankings`

### Credential behavior

`server.mjs` does not need stored Conductor credentials anymore.

The UI now has fields for:

- `API key`
- `Secret API key`

When the user clicks `Connect to Conductor`:

- the browser sends those values to `POST /api/connect`
- `server.mjs` validates them by calling Conductor
- the credentials are kept in memory for the current local server session only

They are not meant to be stored in the app or committed into config files.

### Current entitlement limitation

This user can access Reporting API data.

This user currently does not have Conductor Data API 2.0 entitlement for live current share/ranking access.

Because of that:

- live accounts, web properties, keyword groups, tracked searches, and annual search volume work
- live current market share does not work from Conductor Data API
- the UI allows manual current-share override

## Page type benchmark files

These CSV files are used for KPI benchmark modeling:

- `/Users/svalenza/Documents/PLP Metrics.csv`
- `/Users/svalenza/Documents/Homepage Metrics.csv`
- `/Users/svalenza/Documents/PDP Metrics.csv`
- `/Users/svalenza/Documents/Brands Metrics.csv`
- `/Users/svalenza/Documents/UGC Metrics.csv`
- `/Users/svalenza/Documents/Deals Metrics.csv`
- `/Users/svalenza/Documents/HVSP Metrics.csv`
- `/Users/svalenza/Documents/Shelters Metrics.csv`
- `/Users/svalenza/Documents/Superlative Metrics.csv`
- `/Users/svalenza/Documents/Education Metrics.csv`
- `/Users/svalenza/Documents/Facet Metrics.csv`

These are loaded by `server.mjs` and exposed to the browser through:

- `/api/page-type-metrics`

Current CTR rule:

- add `0.5` percentage points to every page type CTR value on load

## Current forecast behavior

### Top summary

The top summary shows:

- Annual search volume
- Current Chewy market share
- Projected market share after 12 months
- Estimated annual traffic opportunity

### Current market share

Current share priority:

1. manual override entered in the UI
2. live Conductor current share if Data API ever becomes available
3. fallback portfolio CTR benchmark proxy

### Projected market share

Projected share is conservative:

- uses the current share baseline
- applies a dampened market-share-lift model
- reaches total attainable market share by month 7
- stays flat after that

### Estimated annual traffic opportunity

Current formula:

```text
Annual Search Volume
* (Projected Market Share After 12 Months - Current Chewy Market Share)
* selected page type CTR
```

The UI also supports a manual override for annual traffic opportunity.

### Monthly table behavior

- Table starts at the current calendar month
- Forecast window is 24 months
- Deployment month/year determines when lift begins
- Before deployment:
  - traffic/opportunity metrics stay at 0
  - market share stays at current baseline
- Final column is `24-mo total`

### Table rows

Current main rows include:

- Estimated Market Share
- Monthly Organic Traffic Opportunity
- Gross Revenue
- Projected Orders
- Projected Acquisitions
- benchmark KPI rows from selected page type

Removed row:

- Annual Traffic Opportunity is no longer shown in the main forecast table

## Keyword group count behavior

Keyword group dropdown counts should use:

- active tracked searches only

Example:

- `HVF Pages` should show active count, not total category membership

## Outcome board behavior

The bottom board supports:

- saving the current analysis as an outcome card
- dragging saved cards into page type buckets
- moving cards between buckets
- dragging cards back to the tray
- deleting cards from anywhere
- exporting saved outcomes as CSV

Each page type bucket currently totals:

- traffic
- revenue
- acquisitions

## UI notes

- header text has been reduced in size
- top summary is compact
- page-level horizontal overflow should be hidden
- the forecast table itself is horizontally scrollable
- overall layout should respond to viewport size

## GitHub / repo access

Chewy GitHub SSH access has been set up locally with:

- Git username: `svalenza-chewy`
- Git email: `svalenza@chewy.com`
- SSH key in `~/.ssh/id_ed25519`

The `Chewy-Inc/conductor` repo was cloned and moved into:

- `conductor/`

## Important current files to edit

- `app.js`: frontend logic, forecasting, board behavior
- `styles.css`: layout and responsive styling
- `index.html`: UI structure
- `server.mjs`: Conductor API access and page type CSV loading
