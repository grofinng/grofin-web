const express = require('express');
const Vendor = require('../models/Vendor');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const filter = {};
    const { category, includeInactive } = req.query;
    if (category) filter.category = category;
    if (req.user.role !== 'admin' || !includeInactive) filter.active = true;
    const vendors = await Vendor.find(filter).sort({ category: 1, area: 1, businessName: 1 });
    res.json({ vendors });
  } catch (err) {
    next(err);
  }
});

async function nextPartnerCode() {
  const last = await Vendor.findOne({ partnerCode: /^GR\d+$/ })
    .sort({ partnerCode: -1 })
    .select('partnerCode')
    .lean();
  const lastNum = last ? parseInt(last.partnerCode.replace(/^GR/, ''), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `GR${String(next).padStart(4, '0')}`;
}

router.post('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const { businessName, address, contactPhone, area, category, partnerCode, ownerName, ownerPhone } = req.body;
    if (!businessName || !address || !area || !category || !ownerName || !ownerPhone) {
      return res.status(400).json({ message: 'Business name, address, area, category, owner name, and owner phone are required' });
    }
    const code = (partnerCode && partnerCode.trim().toUpperCase()) || (await nextPartnerCode());

    const exists = await Vendor.findOne({ partnerCode: code });
    if (exists) return res.status(409).json({ message: `Partner code ${code} already exists` });

    const vendor = await Vendor.create({
      businessName,
      address,
      contactPhone: contactPhone || '',
      area,
      category,
      partnerCode: code,
      ownerName,
      ownerPhone,
    });
    res.status(201).json({ vendor });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const { businessName, address, contactPhone, area, category, active, ownerName, ownerPhone } = req.body;
    const update = {};
    if (businessName !== undefined) update.businessName = businessName;
    if (address !== undefined) update.address = address;
    if (contactPhone !== undefined) update.contactPhone = contactPhone;
    if (area !== undefined) update.area = area;
    if (category !== undefined) update.category = category;
    if (active !== undefined) update.active = !!active;
    if (ownerName !== undefined) update.ownerName = ownerName;
    if (ownerPhone !== undefined) update.ownerPhone = ownerPhone;

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ vendor });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
