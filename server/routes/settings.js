const express = require('express');
const Setting = require('../models/Setting');
const { protect, requireAdmin, requireStaff } = require('../middleware/auth');

const router = express.Router();

const REPAYMENT_KEY = 'repaymentAccount';

// Used until an admin saves their own. Keeps approvals working on a fresh DB.
const FALLBACK_REPAYMENT_ACCOUNT = {
  bank: 'Kuda MFB',
  accountNumber: '3002281109',
  accountName: 'Damance Nigeria',
};

function shapeRepayment(doc) {
  if (!doc) return { ...FALLBACK_REPAYMENT_ACCOUNT, updatedAt: null, isFallback: true };
  const v = doc.value || {};
  return {
    bank: v.bank || '',
    accountNumber: v.accountNumber || '',
    accountName: v.accountName || '',
    updatedAt: doc.updatedAt,
    isFallback: false,
  };
}

// Staff — the account customers repay into. Pre-fills the approval form.
router.get('/repayment-account', protect, requireStaff, async (_req, res, next) => {
  try {
    const doc = await Setting.findOne({ key: REPAYMENT_KEY });
    res.json({ account: shapeRepayment(doc) });
  } catch (err) {
    next(err);
  }
});

// Admin — replace the default repayment account.
router.put('/repayment-account', protect, requireAdmin, async (req, res, next) => {
  try {
    const bank = String(req.body.bank || '').trim();
    const accountNumber = String(req.body.accountNumber || '').trim();
    const accountName = String(req.body.accountName || '').trim();
    if (!bank || !accountName) {
      return res.status(400).json({ message: 'Bank and account name are required' });
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ message: 'Account number must be 10 digits' });
    }
    const doc = await Setting.findOneAndUpdate(
      { key: REPAYMENT_KEY },
      { value: { bank, accountNumber, accountName }, updatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ account: shapeRepayment(doc) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
