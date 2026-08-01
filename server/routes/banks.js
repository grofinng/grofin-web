const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Nigerian bank list, proxied from Paystack's public endpoint and cached
// in memory for the life of the process.
let banksCache = null;

router.get('/', protect, async (_req, res, next) => {
  try {
    if (!banksCache) {
      const r = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100');
      const json = await r.json();
      if (!json.status) throw new Error(json.message || 'Could not load bank list');
      banksCache = json.data
        .map((b) => ({ name: b.name, code: b.code }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    res.json({ banks: banksCache });
  } catch (err) {
    next(err);
  }
});

// Resolve an account number to the registered account name via Paystack.
// Needs PAYSTACK_SECRET_KEY; without it the client falls back to manual entry.
router.get('/resolve', protect, async (req, res, next) => {
  try {
    const accountNumber = String(req.query.account_number || '');
    const bankCode = String(req.query.bank_code || '');
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ message: 'Account number must be 10 digits' });
    }
    if (!bankCode) {
      return res.status(400).json({ message: 'Select a bank first' });
    }
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
      return res
        .status(503)
        .json({ message: 'Account verification is not configured', manual: true });
    }
    const r = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const json = await r.json().catch(() => ({}));
    // Key problems (invalid/revoked key, feature not enabled) are our
    // configuration issue, not the customer's — fall back to manual entry.
    if (r.status === 401 || r.status === 403) {
      console.error('Paystack resolve auth error:', r.status, json.message);
      return res
        .status(503)
        .json({ message: 'Account verification is temporarily unavailable', manual: true });
    }
    if (!r.ok || !json.status || !json.data?.account_name) {
      console.error('Paystack resolve failed:', r.status, json.message);
      return res.status(422).json({
        message: json.message
          ? `Could not verify this account: ${json.message}`
          : 'Could not verify this account number with the selected bank',
      });
    }
    res.json({ accountName: json.data.account_name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
