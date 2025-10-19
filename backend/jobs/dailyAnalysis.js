// backend/jobs/dailyAnalysis.js
const cron = require('node-cron');
const { analyzeAllUsers } = require('../services/proactiveCoachService');

let isRunning = false;

/**
 * Daily analysis job - runs at midnight every day
 * Cron format: second minute hour day month weekday
 * '0 0 * * *' = At 00:00 (midnight) every day
 */
function startDailyAnalysis() {
  // Run at midnight every day (IST = UTC+5:30, so adjust if needed)
  const job = cron.schedule('0 0 * * *', async () => {
    if (isRunning) {
      console.log('[DailyAnalysis] Previous job still running, skipping...');
      return;
    }

    try {
      isRunning = true;
      console.log('[DailyAnalysis] Starting daily analysis job...');
      const notificationCount = await analyzeAllUsers();
      console.log(`[DailyAnalysis] Completed. Created ${notificationCount} notifications.`);
    } catch (error) {
      console.error('[DailyAnalysis] Error in daily job:', error);
    } finally {
      isRunning = false;
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // IST timezone
  });

  console.log('[DailyAnalysis] Cron job scheduled for midnight (00:00 IST)');
  return job;
}

/**
 * Manual trigger for testing (can be called via API route)
 */
async function triggerManualAnalysis() {
  if (isRunning) {
    throw new Error('Analysis already running');
  }

  try {
    isRunning = true;
    console.log('[DailyAnalysis] Manual analysis triggered...');
    const notificationCount = await analyzeAllUsers();
    console.log(`[DailyAnalysis] Manual analysis complete. Created ${notificationCount} notifications.`);
    return { success: true, notificationCount };
  } catch (error) {
    console.error('[DailyAnalysis] Manual analysis error:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

module.exports = {
  startDailyAnalysis,
  triggerManualAnalysis,
};
