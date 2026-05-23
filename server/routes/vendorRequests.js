const express = require('express');
const VendorRequest = require('../models/VendorRequest');
const Vendor = require('../models/Vendor');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function nextPartnerCode() {
  const last = await Vendor.findOne({ partnerCode: /^GR\d+$/ })
    .sort({ partnerCode: -1 })
    .select('partnerCode')
    .lean();
  const lastNum = last ? parseInt(last.partnerCode.replace(/^GR/, ''), 10) : 0;
  const next = (Number.isFinite(lastNum) ? lastNum : 0) + 1;
  return `GR${String(next).padStart(4, '0')}`;
}

// Public — anyone visiting the marketing site can submit
router.post('/', async (req, res, next) => {
  try {
    const {
      businessName, address, area, category,
      contactPhone, ownerName, ownerPhone, ownerEmail, notes,
    } = req.body;

    if (!businessName || !address || !area || !category) {
      return res.status(400).json({ message: 'Business name, address, area, and category are required' });
    }
    if (!ownerName || !ownerPhone || !ownerEmail) {
      return res.status(400).json({ message: 'Owner name, phone, and email are required' });
    }

    const created = await VendorRequest.create({
      businessName,
      address,
      area,
      category,
      contactPhone: contactPhone || '',
      ownerName,
      ownerPhone,
      ownerEmail,
      notes: notes || '',
    });
    res.status(201).json({ request: created });
  } catch (err) {
    next(err);
  }
});

// Admin — list requests, optionally filtered by status
router.get('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await VendorRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('approvedVendor', 'partnerCode businessName');
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// Admin — approve a request: creates a Vendor, links it back
router.patch('/:id/approve', protect, requireAdmin, async (req, res, next) => {
  try {
    const reqDoc = await VendorRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status === 'approved') {
      return res.status(400).json({ message: 'Request is already approved' });
    }

    const partnerCode = await nextPartnerCode();
    const vendor = await Vendor.create({
      businessName: reqDoc.businessName,
      address: reqDoc.address,
      contactPhone: reqDoc.contactPhone,
      area: reqDoc.area,
      category: reqDoc.category,
      partnerCode,
      ownerName: reqDoc.ownerName,
      ownerPhone: reqDoc.ownerPhone,
      active: true,
    });

    reqDoc.status = 'approved';
    reqDoc.adminNote = req.body?.adminNote || '';
    reqDoc.approvedVendor = vendor._id;
    await reqDoc.save();

    const populated = await VendorRequest.findById(reqDoc._id).populate(
      'approvedVendor',
      'partnerCode businessName'
    );
    res.json({ request: populated, vendor });
  } catch (err) {
    next(err);
  }
});

// Admin — reject a request (reason required)
router.patch('/:id/reject', protect, requireAdmin, async (req, res, next) => {
  try {
    const { adminNote } = req.body || {};
    if (!String(adminNote || '').trim()) {
      return res.status(400).json({ message: 'A reason is required when rejecting a request' });
    }
    const reqDoc = await VendorRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject an already-approved request' });
    }
    reqDoc.status = 'rejected';
    reqDoc.adminNote = adminNote;
    await reqDoc.save();
    res.json({ request: reqDoc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
