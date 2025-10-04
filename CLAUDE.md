# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freedom Flotilla Coalition vessel tracking system that scrapes vessel data hourly, calculates estimated time of arrival (ETA) to Gaza, and sends automated email reports. Data source: https://flotilla-orpin.vercel.app/tmtg-ffc-2025-09

## Essential Commands

### Running the System

```bash
npm start                  # Complete workflow: scrape → process → email
npm run scrape            # Scrape vessel data only (bypasses .env validation when run directly)
npm run process           # Process existing data only
npm run email             # Send email from latest processed data
npm run schedule          # Start hourly scheduler (runs at :00 of each hour)
npm run schedule:now      # Run workflow immediately once
```

### Testing Individual Components

```bash
node src/scraper.js       # Test scraper independently (NODE_ENV=test set automatically)
node src/data_processor.js # Test processor with sample data
node src/email_sender.js  # Test email generation and sending
```

### Setup Requirements

```bash
npm install
npx playwright install chromium   # Required for web scraping
cp .env.example .env              # Then configure RESEND_API_KEY, SMTP_SENDER_EMAIL, RECIPIENT_EMAIL
```

## Architecture Overview

### Data Flow Pipeline

**Scrape → Process → Email** is the core pipeline orchestrated by `src/main.js`:

1. **Scraper** (`src/scraper.js`): Uses Playwright to scrape vessel data from the Freedom Flotilla Coalition website. Expands each vessel row, extracts position/speed/status data, and filters out incidents (entries without position data or names ending in status words).

2. **Processor** (`src/data_processor.js`):
   - Converts UTC timestamps to Malaysia Time (UTC+8)
   - Calculates distance to Gaza (31.5°N, 34.45°E) using Haversine formula
   - **Calculates ETA** based on: `distance_nm / speed_knots = hours_to_gaza`
   - ETA is null for intercepted/docked vessels or speeds < 0.5 knots
   - Saves to `data/vessels_latest.json` and appends to `data/vessels_history.json` (maintains 720 entries = 30 days)

3. **Email Sender** (`src/email_sender.js`): Generates HTML/text emails from templates with vessel details including ETA column, sends via Resend SMTP.

### Key Calculations

**Distance to Gaza** (Haversine formula):
```javascript
// Gaza coordinates: 31.5°N, 34.45°E
const distance_nm = calculateDistance(vessel_lat, vessel_lon, 31.5, 34.45)
// Returns nautical miles
```

**ETA Calculation** (`src/data_processor.js:79-146`):
```javascript
// If speed < 0.5 knots → "Not moving"
// If INTERCEPTED/DOCKED/ANCHORED → null
// Otherwise: hours = distance_nm / speed_knots
// Display format: "2d 22h" or "18 hours" depending on duration
```

### Configuration System

`src/config.js` loads from `.env` with validation. **Important**: Validation is bypassed when `NODE_ENV=test` to allow testing scrapers without full email config.

Default URL: `https://flotilla-orpin.vercel.app/tmtg-ffc-2025-09`

### Logging

Each component has its own logger instance (`src/logger.js`). Logs saved to `logs/` directory:
- `scraper.log` - Web scraping activities
- `processor.log` - Data processing & calculations
- `email.log` - Email sending status
- `main.log` - Workflow orchestration
- `scheduler.log` - Scheduled task execution

### Scheduler

`scheduler.js` uses `node-cron` to run workflow every hour at minute 0 (timezone: Asia/Kuala_Lumpur). Tracks consecutive failures and alerts after 3 failures.

## Vessel Data Structure

Processed vessel object includes:
```javascript
{
  id, name, location, status,
  last_update_utc, last_update_myt, last_update_myt_display,
  speed, position, course,
  distance_to_gaza_nm, distance_to_gaza,
  eta_to_gaza_hours, eta_to_gaza_days, eta_to_gaza, eta_timestamp
}
```

## Email Templates

Located in `templates/`:
- `email_template.html` - HTML email with table layout including ETA column
- `email_template.txt` - Plain text fallback

Templates use `{{PLACEHOLDER}}` syntax. The email generator replaces:
- `{{TOTAL_VESSELS}}`, `{{SAILING_COUNT}}`, `{{INTERCEPTED_COUNT}}`
- `{{REPORT_TIMESTAMP}}`, `{{MOST_RECENT_UPDATE}}`
- `{{VESSEL_ROWS}}` - Generated dynamically with ETA data

## Important Implementation Details

1. **Scraper Filtering**: The scraper filters out incidents by checking:
   - Name patterns (contains "attack", "incident", ends with status words)
   - Absence of vessel data (no position/speed/course)

2. **Status Normalization**: "ASSUMED INTERCEPTED" is normalized to "INTERCEPTED"

3. **Test Mode**: When running scrapers directly (`node src/scraper.js`), `NODE_ENV=test` is set automatically to bypass config validation

4. **Timezone**: All displayed times use Malaysia Time (UTC+8), configurable via `TIMEZONE` env var

5. **Retry Logic**: 3 attempts with exponential backoff (2^attempt * 1000ms) for scraping and email sending

6. **History Retention**: `vessels_history.json` keeps last 720 entries (30 days of hourly data)
