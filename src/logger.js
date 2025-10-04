const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Creates a logger instance for a specific module
 * @param {string} module - Module name for the logger
 * @returns {winston.Logger} Logger instance
 */
function createLogger(module) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        const msg = `${timestamp} [${module.toUpperCase()}] ${level.toUpperCase()}: ${message}`;
        return stack ? `${msg}\n${stack}` : msg;
      })
    ),
    transports: [
      // Console output
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${module.toUpperCase()}] ${level}: ${message}`;
          })
        )
      }),
      // File output
      new winston.transports.File({
        filename: path.join(logsDir, `${module}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
}

module.exports = { createLogger };
