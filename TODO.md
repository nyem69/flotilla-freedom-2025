# TODO - Freedom Flotilla Coalition Tracker

## Completed ✅

- [x] Duplicate project from flotilla-sumud-2025
- [x] Update data source to Freedom Flotilla Coalition (https://flotilla-orpin.vercel.app/tmtg-ffc-2025-09)
- [x] Implement ETA calculations based on distance, speed, and position
- [x] Add ETA fields to vessel data structure
- [x] Update email templates with ETA column
- [x] Fix email status cards display for mobile clients (table-based layout)
- [x] Update project branding to Freedom Flotilla Coalition
- [x] Change scheduler name to flotilla-freedom-scheduler
- [x] Fix data directory creation on fresh installation
- [x] Update email HTML title to "Freedom Flotilla Coalition Tracker"
- [x] Sort vessels by distance to Gaza (ascending - closest first)
- [x] Create CLAUDE.md documentation
- [x] Add .gitignore file
- [x] Initial GitHub repository setup

## In Progress 🚧

- [ ] Fix email subject typo: "Trackert" → "Tracker"

## Pending 📋

### Subscriber Management System
- [ ] Create `flotilla_subscribers` table in mysql_aiven_warroom database
  - Requires admin DDL permissions
  - Schema ready (see implementation plan in conversation)
- [ ] Build SvelteKit subscription management website
  - Email verification flow
  - Unsubscribe mechanism
  - Timezone preference management
  - Email frequency settings (60/30/15 minutes)
- [ ] Update email sender to support:
  - Multiple subscribers from database
  - Per-subscriber timezone customization
  - Frequency-based email delivery
  - Unsubscribe token in email footer
- [ ] Deploy SvelteKit app to Cloudflare Pages
- [ ] Update scheduler to run every 15 minutes (to support 15-min frequency)
- [ ] Implement rate limiting for subscription endpoints
- [ ] Add GDPR compliance features (data export/deletion)

### Email Improvements
- [ ] Add vessel status summary to subject line (e.g., "11 Sailing, 0 Intercepted")
- [ ] Create plain text email template improvements
- [ ] Test email rendering across different email clients

### Data & Monitoring
- [ ] Add historical ETA tracking
- [ ] Create dashboard for vessel progress visualization
- [ ] Implement alerting for status changes (sailing → intercepted)
- [ ] Add data export functionality (CSV/JSON)

### Testing & Quality
- [ ] Write unit tests for ETA calculations
- [ ] Add integration tests for scraper
- [ ] Test email delivery with different timezones
- [ ] Performance testing for subscriber queries

### Documentation
- [ ] Update README with subscriber management features
- [ ] Document database schema
- [ ] Create API documentation for subscription endpoints
- [ ] Add deployment guide for Cloudflare

## Future Enhancements 💡

- [ ] Multi-language support for emails
- [ ] SMS notifications option
- [ ] Webhook support for real-time updates
- [ ] Mobile app for subscribers
- [ ] Historical data analytics dashboard
- [ ] Weather data integration for route predictions
- [ ] Custom notification rules (alert when vessel < X nm from Gaza)
- [ ] Social media integration for updates
- [ ] Public API for vessel tracking data

## Known Issues 🐛

- Email subject has typo: "Trackert" instead of "Tracker" (needs fix)

## Notes 📝

- Both flotilla-sumud-2025 and flotilla-freedom-2025 can run simultaneously with different PM2 process names
- Database connection uses mysql_aiven_warroom for subscriber data
- Email delivery via Resend SMTP
- Timezone: Default is Asia/Kuala_Lumpur (UTC+8)
- Gaza coordinates: 31.5°N, 34.45°E

---

Last updated: 2025-10-05
