# Flotilla Sumud 2025 - Automated Vessel Monitoring

Automated monitoring and hourly reporting system for the Global Sumud Flotilla vessel tracking website.

## Email Report Example

![Email Report Example](Flotilla-Sumud-Report-20251002-120836-MYT.png)

*Example of hourly email report showing vessel tracking with distance to Gaza*

## Features

- 🚢 **Automated Vessel Tracking**: Scrapes 44 vessels from the Global Sumud Flotilla website
- ⏰ **Hourly Reports**: Automatically generates and emails reports every hour
- 🌏 **Timezone Conversion**: Converts all timestamps from UTC to Malaysia Time (UTC+8)
- 📍 **Distance Calculation**: Calculates distance to Gaza for each vessel in nautical miles
- 📊 **Data Sorting**: Organizes vessels by most recent update
- 📧 **Beautiful Email Reports**: Professional HTML emails with color-coded vessel statuses
- 🎯 **Smart Filtering**: Automatically filters out incidents and non-vessel entries
- 💾 **Historical Data**: Maintains complete history of all vessel updates
- 🔄 **Retry Logic**: Automatic retry with exponential backoff for resilience
- 📝 **Comprehensive Logging**: Detailed logs for debugging and monitoring

## Installation

### Prerequisites

- Node.js 16+ or higher
- npm or yarn package manager

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nyem69/flotilla-sumud-2025.git
   cd flotilla-sumud-2025
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your email credentials:
   ```env
   SMTP_SENDER_EMAIL=your-sender@domain.com
   SMTP_SENDER_NAME=Your Name
   SMTP_HOST=smtp.resend.com
   RESEND_API_KEY=your-resend-api-key
   RECIPIENT_EMAIL=recipient@domain.com
   ```

## Usage

### Run Complete Workflow (One Time)
Scrape vessels, process data, and send email report:
```bash
npm start
```

### Run Individual Components

**Scrape vessels only:**
```bash
npm run scrape
```

**Process existing data:**
```bash
npm run process
```

**Send email from latest data:**
```bash
npm run email
```

### Start Hourly Scheduler

**Start scheduler (runs every hour on the hour):**
```bash
npm run schedule
```

**Run scheduler once immediately:**
```bash
npm run schedule:now
```

The scheduler will:
- Run at minute 0 of every hour (e.g., 1:00 PM, 2:00 PM, 3:00 PM)
- Execute the complete workflow automatically
- Log all activities to `logs/scheduler.log`
- Continue running even if individual runs fail
- Send alert after 3 consecutive failures

## Data Structure

### Vessel Data Format

```json
{
  "id": 1,
  "name": "Adagio",
  "location": "Beit Hanoun",
  "status": "INTERCEPTED",
  "last_update_utc": "2025-10-02T01:43:00.000Z",
  "last_update_myt": "2025-10-02T09:43:00+08:00",
  "last_update_myt_display": "2025-10-02 09:43:00",
  "speed": "6.59 knots",
  "position": "31.5946, 33.5379",
  "course": "90°",
  "distance_to_gaza_nm": 47.0,
  "distance_to_gaza": "47 nm"
}
```

### Report Format

```json
{
  "report_generated": "2025-10-02T12:54:51+08:00",
  "report_generated_display": "2025-10-02 12:54:51",
  "total_vessels": 44,
  "vessels": [...],
  "summary": {
    "sailing": 25,
    "intercepted": 19,
    "docked": 0,
    "anchored": 0,
    "unknown": 0,
    "most_recent_update": "2025-10-02 12:43:00"
  }
}
```

## Email Configuration

This project uses [Resend](https://resend.com) for email delivery via SMTP.

### Getting Your Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Add the key to your `.env` file as `RESEND_API_KEY`

### Email Features

- **HTML Template**: Professional design with color-coded statuses
- **Plain Text Fallback**: Full compatibility with all email clients
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Distance Information**: Shows distance to Gaza in nautical miles for each vessel
- **Color Coding**:
  - 🟢 Green = SAILING
  - 🔴 Red = INTERCEPTED
  - 🔵 Blue = DOCKED

## File Structure

```
flotilla-sumud-2025/
├── src/
│   ├── config.js          # Configuration management
│   ├── logger.js          # Logging utility
│   ├── scraper.js         # Web scraper (Playwright)
│   ├── data_processor.js  # Data processing & timezone conversion
│   ├── email_sender.js    # Email generation & sending
│   └── main.js            # Main workflow orchestrator
├── templates/
│   ├── email_template.html  # HTML email template
│   └── email_template.txt   # Plain text email template
├── data/
│   ├── vessels_latest.json  # Latest vessel data
│   └── vessels_history.json # Historical data log
├── logs/
│   ├── scraper.log        # Scraping logs
│   ├── processor.log      # Processing logs
│   ├── email.log          # Email sending logs
│   └── scheduler.log      # Scheduler logs
├── scheduler.js           # Hourly scheduler
├── package.json          # Dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## Logging

Logs are stored in the `logs/` directory with separate files for each component:

- **scraper.log**: Web scraping activities
- **processor.log**: Data processing operations
- **email.log**: Email sending status
- **scheduler.log**: Scheduled task execution
- **main.log**: Overall workflow execution

Log levels: DEBUG, INFO, WARNING, ERROR

## Error Handling

The system includes robust error handling:

- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout Handling**: Configurable timeouts for all operations
- **Graceful Degradation**: Continues operation even if some vessels fail
- **Failure Tracking**: Monitors consecutive failures
- **Smart Filtering**: Automatically excludes incidents and non-vessel entries from scraping
- **Status Normalization**: Maps "assumed intercepted" to "INTERCEPTED" for consistency
- **Comprehensive Logging**: All errors logged with context

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start scheduler with PM2
pm2 start scheduler.js --name flotilla-scheduler

# View logs
pm2 logs flotilla-scheduler

# Stop
pm2 stop flotilla-scheduler

# Restart
pm2 restart flotilla-scheduler

# Set to start on boot
pm2 startup
pm2 save
```

### Using System Cron (Alternative)

```bash
# Edit crontab
crontab -e

# Add hourly task (runs at minute 0 of every hour)
0 * * * * cd /path/to/flotilla-sumud-2025 && /usr/bin/node scheduler.js --now >> logs/cron.log 2>&1
```

### Using Docker

```dockerfile
# Dockerfile coming soon
```

## Troubleshooting

### Email Not Sending

1. Check your Resend API key is correct in `.env`
2. Verify sender email is verified in Resend dashboard
3. Check `logs/email.log` for error details

### Scraper Failing

1. Ensure Playwright browsers are installed: `npx playwright install chromium`
2. Check if website structure has changed
3. Try running with `HEADLESS_MODE=false` to see browser
4. Review `logs/scraper.log` for details

### Timezone Issues

All times are converted to Malaysia Time (UTC+8). To change timezone:
1. Update `TIMEZONE` in `.env`
2. Use format from [moment-timezone](https://momentjs.com/timezone/)

## Development

### Running Tests

```bash
npm test
```

### Debug Mode

Set log level to DEBUG in `.env`:
```env
LOG_LEVEL=DEBUG
```

### Manual Testing

Test individual components:
```bash
# Test scraper
node src/scraper.js

# Test processor
node src/data_processor.js

# Test email
node src/email_sender.js

# Test complete workflow
node src/main.js
```

## Data Source

This system scrapes data from: https://flotilla-orpin.vercel.app/

The Global Sumud Flotilla is a coordinated, nonviolent fleet of vessels sailing to break the Israeli occupation's illegal siege on Gaza.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

For issues or questions:
- Open an issue on GitHub
- Check the logs in `logs/` directory
- Review the TODO.md for planned features

## Acknowledgments

- Data source: [Global Sumud Flotilla](https://globalsumudflotilla.org)
- Forensic Architecture for tracking platform
- Email delivery: [Resend](https://resend.com)

---

**Generated with ❤️ for humanitarian monitoring**
