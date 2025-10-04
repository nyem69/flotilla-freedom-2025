const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { createLogger } = require('./logger');

const logger = createLogger('processor');

// Gaza coordinates (approximate center)
const GAZA_COORDS = { lat: 31.5, lon: 34.45 };

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in nautical miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Parse position string and calculate distance to Gaza
 * @param {string} position - Position string in format "lat, lon"
 * @returns {Object} Distance info object
 */
function calculateDistanceToGaza(position) {
  if (!position) {
    return { distance_nm: null, distance_display: null };
  }

  try {
    const [lat, lon] = position.split(',').map(s => parseFloat(s.trim()));

    if (isNaN(lat) || isNaN(lon)) {
      return { distance_nm: null, distance_display: null };
    }

    const distance = calculateDistance(lat, lon, GAZA_COORDS.lat, GAZA_COORDS.lon);
    return {
      distance_nm: distance,
      distance_display: `${distance} nm`
    };
  } catch (error) {
    logger.warn(`Error calculating distance for position ${position}: ${error.message}`);
    return { distance_nm: null, distance_display: null };
  }
}

/**
 * Calculate ETA to Gaza based on current position, speed, and distance
 * @param {number} distanceNm - Distance to Gaza in nautical miles
 * @param {string} speedStr - Speed string (e.g., "6.59 knots")
 * @param {string} status - Vessel status
 * @returns {Object} ETA information object
 */
function calculateETA(distanceNm, speedStr, status) {
  // If vessel is intercepted, docked, or no distance/speed available
  if (!distanceNm || !speedStr || status === 'INTERCEPTED' || status === 'DOCKED' || status === 'ANCHORED') {
    return {
      eta_hours: null,
      eta_days: null,
      eta_display: null,
      eta_timestamp: null
    };
  }

  try {
    // Parse speed from string like "6.59 knots"
    const speedMatch = speedStr.match(/([0-9.]+)/);
    if (!speedMatch) {
      return {
        eta_hours: null,
        eta_days: null,
        eta_display: null,
        eta_timestamp: null
      };
    }

    const speedKnots = parseFloat(speedMatch[1]);

    // If speed is 0 or very low, vessel is not moving
    if (speedKnots < 0.5) {
      return {
        eta_hours: null,
        eta_days: null,
        eta_display: 'Not moving',
        eta_timestamp: null
      };
    }

    // Calculate time in hours
    const hoursToGaza = distanceNm / speedKnots;
    const daysToGaza = hoursToGaza / 24;

    // Calculate ETA timestamp
    const etaMoment = moment().utc().add(hoursToGaza, 'hours');

    // Format display
    let etaDisplay;
    if (daysToGaza < 1) {
      etaDisplay = `${Math.round(hoursToGaza)} hours`;
    } else {
      const days = Math.floor(daysToGaza);
      const remainingHours = Math.round((daysToGaza - days) * 24);
      etaDisplay = `${days}d ${remainingHours}h`;
    }

    return {
      eta_hours: Math.round(hoursToGaza * 10) / 10,
      eta_days: Math.round(daysToGaza * 100) / 100,
      eta_display: etaDisplay,
      eta_timestamp: etaMoment.toISOString()
    };
  } catch (error) {
    logger.warn(`Error calculating ETA: ${error.message}`);
    return {
      eta_hours: null,
      eta_days: null,
      eta_display: null,
      eta_timestamp: null
    };
  }
}

/**
 * Processes raw vessel data: converts timestamps, sorts, and structures data
 * @param {Array} vessels - Raw vessel data from scraper
 * @returns {Object} Processed vessel data with summary
 */
function processVesselData(vessels) {
  logger.info(`Processing ${vessels.length} vessels`);

  // Convert timestamps and enrich data
  const processedVessels = vessels.map((vessel, index) => {
    const lastUpdateUTC = parseTimestamp(vessel.last_update_utc);
    const lastUpdateMYT = convertToMalaysiaTime(lastUpdateUTC);
    const distanceInfo = calculateDistanceToGaza(vessel.position);
    const etaInfo = calculateETA(distanceInfo.distance_nm, vessel.speed, vessel.status);

    return {
      id: vessel.id || index + 1,
      name: vessel.name,
      location: vessel.location || null,
      status: vessel.status || 'UNKNOWN',
      last_update_utc: lastUpdateUTC.toISOString(),
      last_update_myt: lastUpdateMYT.format('YYYY-MM-DDTHH:mm:ssZ'),
      last_update_myt_display: lastUpdateMYT.format('YYYY-MM-DD HH:mm:ss'),
      speed: vessel.speed || null,
      position: vessel.position || null,
      course: vessel.course || null,
      distance_to_gaza_nm: distanceInfo.distance_nm,
      distance_to_gaza: distanceInfo.distance_display,
      eta_to_gaza_hours: etaInfo.eta_hours,
      eta_to_gaza_days: etaInfo.eta_days,
      eta_to_gaza: etaInfo.eta_display,
      eta_timestamp: etaInfo.eta_timestamp
    };
  });

  // Sort by latest timestamp (most recent first)
  processedVessels.sort((a, b) => {
    const timeA = moment(a.last_update_myt);
    const timeB = moment(b.last_update_myt);
    return timeB.diff(timeA); // Descending order
  });

  // Calculate summary statistics
  const summary = calculateSummary(processedVessels);

  // Create final data structure
  const reportData = {
    report_generated: moment().tz(config.timezone).format('YYYY-MM-DDTHH:mm:ssZ'),
    report_generated_display: moment().tz(config.timezone).format('YYYY-MM-DD HH:mm:ss'),
    total_vessels: processedVessels.length,
    vessels: processedVessels,
    summary
  };

  logger.info(`Processing complete: ${reportData.total_vessels} vessels, ${summary.sailing} sailing, ${summary.intercepted} intercepted`);

  return reportData;
}

/**
 * Parses various timestamp formats to moment object
 * @param {string} timestamp - Timestamp string
 * @returns {moment.Moment} Moment object in UTC
 */
function parseTimestamp(timestamp) {
  if (!timestamp) {
    return moment().utc();
  }

  // Try parsing as ISO format first
  let parsed = moment.utc(timestamp, moment.ISO_8601, true);

  if (!parsed.isValid()) {
    // Try common formats including the flotilla format: "2 Oct 2025 01:43 UTC"
    const formats = [
      'D MMM YYYY HH:mm UTC',   // Flotilla format
      'D MMM YYYY HH:mm [UTC]', // Flotilla format variant
      'YYYY-MM-DD HH:mm:ss',
      'DD/MM/YYYY HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss',
      'YYYY-MM-DD HH:mm',
      'DD/MM/YYYY HH:mm'
    ];

    for (const format of formats) {
      parsed = moment.utc(timestamp, format, true);
      if (parsed.isValid()) break;
    }
  }

  // Fallback to current time if still invalid
  if (!parsed.isValid()) {
    logger.warn(`Invalid timestamp format: ${timestamp}, using current time`);
    parsed = moment().utc();
  }

  return parsed;
}

/**
 * Converts UTC time to Malaysia Time (UTC+8)
 * @param {moment.Moment} utcTime - Moment object in UTC
 * @returns {moment.Moment} Moment object in Malaysia Time
 */
function convertToMalaysiaTime(utcTime) {
  return utcTime.clone().tz(config.timezone);
}

/**
 * Calculates summary statistics from vessel data
 * @param {Array} vessels - Processed vessel array
 * @returns {Object} Summary statistics
 */
function calculateSummary(vessels) {
  const statusCounts = vessels.reduce((acc, vessel) => {
    const status = vessel.status.toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const mostRecentUpdate = vessels.length > 0
    ? vessels[0].last_update_myt_display
    : null;

  return {
    sailing: statusCounts.sailing || 0,
    intercepted: statusCounts.intercepted || 0,
    docked: statusCounts.docked || 0,
    anchored: statusCounts.anchored || 0,
    unknown: statusCounts.unknown || 0,
    most_recent_update: mostRecentUpdate
  };
}

/**
 * Saves processed data to files
 * @param {Object} reportData - Processed report data
 */
async function saveData(reportData) {
  const dataDir = path.join(__dirname, '..', 'data');

  // Create data directory if it doesn't exist
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore error
  }

  // Save latest data
  const latestPath = path.join(dataDir, 'vessels_latest.json');
  await fs.writeFile(latestPath, JSON.stringify(reportData, null, 2));
  logger.info(`Saved latest data to ${latestPath}`);

  // Append to history
  const historyPath = path.join(dataDir, 'vessels_history.json');

  try {
    let history = [];
    try {
      const historyContent = await fs.readFile(historyPath, 'utf8');
      history = JSON.parse(historyContent);
    } catch (error) {
      // File doesn't exist or is empty, start fresh
      logger.debug('Starting new history file');
    }

    // Add current report to history
    history.push({
      timestamp: reportData.report_generated,
      total_vessels: reportData.total_vessels,
      summary: reportData.summary
    });

    // Keep only last 30 days of history (720 entries for hourly reports)
    if (history.length > 720) {
      history = history.slice(-720);
    }

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    logger.info(`Appended to history (${history.length} entries)`);

  } catch (error) {
    logger.error(`Error updating history: ${error.message}`);
  }
}

/**
 * Main processing function
 * @param {Array} vessels - Raw vessel data
 * @returns {Promise<Object>} Processed and saved data
 */
async function processAndSave(vessels) {
  const processedData = processVesselData(vessels);
  await saveData(processedData);
  return processedData;
}

// Allow direct execution for testing
if (require.main === module) {
  (async () => {
    // Test with sample data
    const sampleVessels = [
      {
        name: 'Test Vessel 1',
        status: 'SAILING',
        last_update_utc: '2025-10-02T02:20:00Z',
        speed: '6.59 knots',
        position: '31.7377, 33.4533',
        course: '90°',
        location: 'Mediterranean Sea'
      },
      {
        name: 'Test Vessel 2',
        status: 'INTERCEPTED',
        last_update_utc: '2025-10-02T01:15:00Z',
        speed: '0 knots',
        position: '31.5000, 34.0000',
        course: '0°',
        location: 'Gaza Coast'
      }
    ];

    try {
      const result = await processAndSave(sampleVessels);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Processing failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { processVesselData, processAndSave };
