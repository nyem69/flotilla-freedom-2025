require('dotenv').config();

const config = {
  // Email configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    apiKey: process.env.RESEND_API_KEY,
    senderEmail: process.env.SMTP_SENDER_EMAIL || 'admin@manamurah.com',
    senderName: process.env.SMTP_SENDER_NAME || 'ManaMurah',
    recipient: process.env.RECIPIENT_EMAIL || 'azmi@aga.my'
  },

  // Scraper configuration
  scraper: {
    url: process.env.FLOTILLA_URL || 'https://flotilla-orpin.vercel.app/tmtg-ffc-2025-09',
    headlessMode: process.env.HEADLESS_MODE === 'true',
    timeoutSeconds: parseInt(process.env.TIMEOUT_SECONDS) || 30,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
    file: process.env.LOG_FILE || 'logs/scraper.log'
  },

  // Timezone configuration
  timezone: process.env.TIMEZONE || 'Asia/Kuala_Lumpur'
};

// Validate required configuration
function validateConfig() {
  const required = [
    { key: 'RESEND_API_KEY', value: config.smtp.apiKey },
    { key: 'SMTP_SENDER_EMAIL', value: config.smtp.senderEmail },
    { key: 'RECIPIENT_EMAIL', value: config.smtp.recipient }
  ];

  const missing = required.filter(item => !item.value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(m => m.key).join(', ')}\n` +
      'Please create a .env file based on .env.example'
    );
  }
}

// Only validate if not in test mode
if (process.env.NODE_ENV !== 'test') {
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration Error:', error.message);
    process.exit(1);
  }
}

module.exports = config;
