// One-shot runner for external schedulers (Render cron, crontab, GitHub Actions).
// Usage: node scripts/sendRepaymentReminders.js [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { runRepaymentReminders } = require('../jobs/repaymentReminders');

(async () => {
  try {
    await connectDB();
    const summary = await runRepaymentReminders({ dryRun: process.argv.includes('--dry-run') });
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.failed.length ? 1 : 0;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
