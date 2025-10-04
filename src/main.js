const { scrapeWithRetry } = require('./scraper');
const { processAndSave } = require('./data_processor');
const { sendEmailWithRetry } = require('./email_sender');
const { createLogger } = require('./logger');

const logger = createLogger('main');

/**
 * Main workflow: Scrape → Process → Email
 * @returns {Promise<Object>} Workflow result
 */
async function runWorkflow() {
  const startTime = Date.now();
  logger.info('=== Starting Flotilla Sumud workflow ===');

  try {
    // Step 1: Scrape vessel data
    logger.info('Step 1: Scraping vessel data...');
    const vessels = await scrapeWithRetry();
    logger.info(`Scraped ${vessels.length} vessels successfully`);

    // Step 2: Process and save data
    logger.info('Step 2: Processing vessel data...');
    const reportData = await processAndSave(vessels);
    logger.info(`Processed data: ${reportData.total_vessels} vessels, ${reportData.summary.sailing} sailing, ${reportData.summary.intercepted} intercepted`);

    // Step 3: Send email report
    logger.info('Step 3: Sending email report...');
    const emailResult = await sendEmailWithRetry(reportData);
    logger.info(`Email sent to ${emailResult.recipient} (Message ID: ${emailResult.messageId})`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`=== Workflow completed successfully in ${duration}s ===`);

    return {
      success: true,
      duration,
      vessels: reportData.total_vessels,
      emailSent: true,
      messageId: emailResult.messageId
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`=== Workflow failed after ${duration}s ===`);
    logger.error(`Error: ${error.message}`);

    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  (async () => {
    try {
      const result = await runWorkflow();
      console.log('\n✅ Workflow completed successfully!');
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Vessels: ${result.vessels}`);
      console.log(`   Email sent: ${result.emailSent}`);
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Workflow failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { runWorkflow };
