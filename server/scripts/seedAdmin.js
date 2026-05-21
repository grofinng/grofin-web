require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@grofin.ng').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'GroFinAdmin@2026';
const ADMIN_FIRST = process.env.ADMIN_FIRST_NAME || 'Esena';
const ADMIN_SURNAME = process.env.ADMIN_SURNAME || 'Admin';

(async () => {
  try {
    await connectDB();
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      let changed = false;
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        changed = true;
      }
      if (changed) {
        await existing.save();
        console.log(`Updated existing user ${ADMIN_EMAIL} → admin role.`);
      } else {
        console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      }
    } else {
      const user = await User.create({
        firstName: ADMIN_FIRST,
        surname: ADMIN_SURNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`Created admin user: ${user.email}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      console.log('Change it after first sign-in.');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
