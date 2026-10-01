const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { runRepaymentReminders, DAYS_BEFORE, OVERDUE_INTERVAL } = require('../jobs/repaymentReminders');

const router = express.Router();

// Vercel Cron calls with `Authorization: Bearer <CRON_SECRET>`. Anything
// else must be a signed-in admin (the "Run reminders now" button).
function cronOrAdmin(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization === `Bearer ${secret}`) return next();
  return protect(req, res, (err) => (err ? next(err) : requireAdmin(req, res, next)));
}

async function handler(req, res, next) {
  try {
    const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';
    const summary = await runRepaymentReminders({ dryRun });
    res.json({ ...summary, schedule: { daysBefore: DAYS_BEFORE, overdueEveryDays: OVERDUE_INTERVAL } });
  } catch (err) {
    next(err);
  }
}

router.get('/repayment-reminders', cronOrAdmin, handler);
router.post('/repayment-reminders', cronOrAdmin, handler);

module.exports = router;
