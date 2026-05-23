require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ImpactStat = require('../models/ImpactStat');

const DEFAULTS = [
  { key: 'transactions', label: 'Transactions Financed', value: '1,900+', icon: 'chart', order: 1 },
  { key: 'produce', label: 'Metric tons of produce supplied', value: '10,000+', icon: 'box', order: 2 },
  { key: 'credit', label: 'Credit Disbursed', value: '₦5M+', icon: 'trending', order: 3 },
  { key: 'meals', label: 'Meals Facilitated', value: '12M+', icon: 'meal', order: 4 },
];

(async () => {
  let created = 0;
  let skipped = 0;
  try {
    await connectDB();
    for (const s of DEFAULTS) {
      const exists = await ImpactStat.findOne({ key: s.key });
      if (exists) {
        skipped++;
        continue;
      }
      await ImpactStat.create(s);
      created++;
    }
    console.log(`Impact stats seeded: ${created} created, ${skipped} existed.`);
  } catch (err) {
    console.error('Failed to seed impact stats:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
