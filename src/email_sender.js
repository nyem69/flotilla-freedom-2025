const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { createLogger } = require('./logger');

const logger = createLogger('email');

/**
 * Creates email transporter configured for Resend API
 * @returns {nodemailer.Transporter} Configured email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: config.smtp.apiKey
    }
  });
}

/**
 * Generates HTML table rows for vessels
 * @param {Array} vessels - Array of vessel objects
 * @returns {string} HTML table rows
 */
function generateVesselRows(vessels) {
  return vessels.map((vessel, index) => {
    const statusClass = vessel.status.toLowerCase();
    const location = vessel.location || '-';
    const speed = vessel.speed || '-';
    const position = vessel.position || '-';
    const course = vessel.course || '-';
    const distance = vessel.distance_to_gaza || '-';
    const eta = vessel.eta_to_gaza || '-';

    return `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${vessel.name}</strong></td>
            <td>${location}</td>
            <td><span class="status ${statusClass}">${vessel.status}</span></td>
            <td>${vessel.last_update_myt_display}</td>
            <td>${speed}</td>
            <td>${distance}</td>
            <td>${eta}</td>
            <td>${position}</td>
            <td>${course}</td>
        </tr>`;
  }).join('\n');
}

/**
 * Generates plain text vessel list
 * @param {Array} vessels - Array of vessel objects
 * @returns {string} Plain text vessel list
 */
function generateVesselTextRows(vessels) {
  return vessels.map((vessel, index) => {
    const location = vessel.location || 'N/A';
    const speed = vessel.speed || 'N/A';
    const position = vessel.position || 'N/A';
    const course = vessel.course || 'N/A';
    const distance = vessel.distance_to_gaza || 'N/A';
    const eta = vessel.eta_to_gaza || 'N/A';

    return `
${index + 1}. ${vessel.name}
   Location:       ${location}
   Status:         ${vessel.status}
   Last Update:    ${vessel.last_update_myt_display}
   Speed:          ${speed}
   Distance:       ${distance}
   ETA to Gaza:    ${eta}
   Position:       ${position}
   Course:         ${course}
`;
  }).join('\n');
}

/**
 * Generates email content from template and data
 * @param {Object} reportData - Vessel report data
 * @returns {Promise<Object>} Object with html and text content
 */
async function generateEmailContent(reportData) {
  // Read templates
  const htmlTemplatePath = path.join(__dirname, '..', 'templates', 'email_template.html');
  const textTemplatePath = path.join(__dirname, '..', 'templates', 'email_template.txt');

  let htmlTemplate = await fs.readFile(htmlTemplatePath, 'utf8');
  let textTemplate = await fs.readFile(textTemplatePath, 'utf8');

  // Generate vessel rows
  const vesselRows = generateVesselRows(reportData.vessels);
  const vesselTextRows = generateVesselTextRows(reportData.vessels);

  // Replace placeholders in HTML
  htmlTemplate = htmlTemplate
    .replace(/{{TOTAL_VESSELS}}/g, reportData.total_vessels)
    .replace(/{{SAILING_COUNT}}/g, reportData.summary.sailing)
    .replace(/{{INTERCEPTED_COUNT}}/g, reportData.summary.intercepted)
    .replace(/{{REPORT_TIMESTAMP}}/g, reportData.report_generated_display)
    .replace(/{{MOST_RECENT_UPDATE}}/g, reportData.summary.most_recent_update || 'N/A')
    .replace(/{{VESSEL_ROWS}}/g, vesselRows);

  // Replace placeholders in text
  textTemplate = textTemplate
    .replace(/{{TOTAL_VESSELS}}/g, reportData.total_vessels)
    .replace(/{{SAILING_COUNT}}/g, reportData.summary.sailing)
    .replace(/{{INTERCEPTED_COUNT}}/g, reportData.summary.intercepted)
    .replace(/{{REPORT_TIMESTAMP}}/g, reportData.report_generated_display)
    .replace(/{{MOST_RECENT_UPDATE}}/g, reportData.summary.most_recent_update || 'N/A')
    .replace(/{{VESSEL_TEXT_ROWS}}/g, vesselTextRows);

  return {
    html: htmlTemplate,
    text: textTemplate
  };
}

/**
 * Sends email report
 * @param {Object} reportData - Vessel report data
 * @returns {Promise<Object>} Send result
 */
async function sendEmailReport(reportData) {
  logger.info('Preparing to send email report');

  try {
    // Generate email content
    const { html, text } = await generateEmailContent(reportData);

    // Create transporter
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: `${config.smtp.senderName} <${config.smtp.senderEmail}>`,
      to: config.smtp.recipient,
      subject: `Freedom Flotilla Coalition Trackert - ${reportData.report_generated_display} MYT`,
      html: html,
      text: text
    };

    logger.info(`Sending email to ${config.smtp.recipient}`);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent successfully: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      recipient: config.smtp.recipient
    };

  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    throw error;
  }
}

/**
 * Sends email with retry logic
 * @param {Object} reportData - Vessel report data
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Send result
 */
async function sendEmailWithRetry(reportData, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Email send attempt ${attempt} of ${maxRetries}`);
      const result = await sendEmailReport(reportData);
      return result;
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
}

// Allow direct execution for testing
if (require.main === module) {
  (async () => {
    try {
      // Read latest vessel data
      const dataPath = path.join(__dirname, '..', 'data', 'vessels_latest.json');
      const reportData = JSON.parse(await fs.readFile(dataPath, 'utf8'));

      console.log('Sending test email...');
      const result = await sendEmailWithRetry(reportData);
      console.log('Email sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      console.log(`Recipient: ${result.recipient}`);
    } catch (error) {
      console.error('Failed to send email:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { sendEmailReport, sendEmailWithRetry };
