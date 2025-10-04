const cron = require('node-cron');
const { runWorkflow } = require('./src/main');
const { createLogger } = require('./src/logger');

const logger = createLogger('scheduler');

// Track consecutive failures for alerting
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_ALERT = 3;

/**
 * Executes workflow and handles errors
 */
async function executeScheduledTask() {
  logger.info('📅 Scheduled task triggered');

  try {
    const result = await runWorkflow();

    // Reset failure counter on success
    consecutiveFailures = 0;

    logger.info(`✅ Scheduled task completed: ${result.vessels} vessels processed, email sent`);

  } catch (error) {
    consecutiveFailures++;

    logger.error(`❌ Scheduled task failed (${consecutiveFailures} consecutive failures)`);
    logger.error(`Error: ${error.message}`);

    if (consecutiveFailures >= MAX_FAILURES_BEFORE_ALERT) {
      logger.error(`⚠️  ALERT: ${consecutiveFailures} consecutive failures! Manual intervention may be required.`);
      // TODO: Implement error notification email
    }
  }
}

/**
 * Starts the scheduler
 */
function startScheduler() {
  logger.info('🚀 Starting Flotilla Sumud Scheduler');
  logger.info('⏰ Schedule: Every hour on the hour (0 * * * *)');
  logger.info('📧 Recipient: From environment configuration');
  logger.info('Press Ctrl+C to stop\n');

  // Schedule to run every hour on the hour (at minute 0)
  const task = cron.schedule('0 * * * *', async () => {
    await executeScheduledTask();
  }, {
    timezone: 'Asia/Kuala_Lumpur'
  });

  logger.info('✅ Scheduler started successfully');
  logger.info('⏳ Waiting for next scheduled run...\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('\n🛑 Received SIGINT, stopping scheduler...');
    task.stop();
    logger.info('✅ Scheduler stopped gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('\n🛑 Received SIGTERM, stopping scheduler...');
    task.stop();
    logger.info('✅ Scheduler stopped gracefully');
    process.exit(0);
  });

  return task;
}

/**
 * Runs workflow immediately (manual trigger)
 */
async function runManually() {
  logger.info('🔧 Running workflow manually...\n');

  try {
    await executeScheduledTask();
    logger.info('\n✅ Manual execution completed');
    process.exit(0);
  } catch (error) {
    logger.error('\n❌ Manual execution failed');
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--now') || args.includes('-n')) {
    // Run immediately
    runManually();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Flotilla Sumud Scheduler

Usage:
  node scheduler.js           Start the hourly scheduler
  node scheduler.js --now     Run workflow immediately
  node scheduler.js --help    Show this help message

The scheduler runs every hour on the hour (0 * * * *) in Malaysia Time (UTC+8).
    `);
    process.exit(0);
  } else {
    // Start scheduler
    startScheduler();
  }
}

module.exports = { startScheduler, executeScheduledTask };
