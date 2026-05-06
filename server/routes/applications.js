const express = require('express');
const Application = require('../models/Application');
const upload = require('../middleware/upload');
const { protect, requireAdmin, requireStaff } = require('../middleware/auth');

const router = express.Router();

const fileFields = upload.fields([
  { name: 'offerLetter', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'staffId', maxCount: 1 },
  { name: 'validId', maxCount: 1 },
]);

function fileFromMulter(file) {
  if (!file) return undefined;
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: `/uploads/${file.filename}`,
  };
}

router.post('/', protect, (req, res, next) => {
  fileFields(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ message: uploadErr.message });
    try {
      const body = req.body;

      let purposes = body.purposes;
      if (typeof purposes === 'string') {
        try { purposes = JSON.parse(purposes); } catch { purposes = [purposes]; }
      }
      let purposeBreakdown = body.purposeBreakdown;
      if (typeof purposeBreakdown === 'string') {
        try { purposeBreakdown = JSON.parse(purposeBreakdown); } catch { purposeBreakdown = []; }
      }
      let vendorSelections = body.vendorSelections;
      if (typeof vendorSelections === 'string') {
        try { vendorSelections = JSON.parse(vendorSelections); } catch { vendorSelections = []; }
      }

      const required = ['offerLetter', 'bankStatement', 'staffId', 'validId'];
      for (const f of required) {
        if (!req.files || !req.files[f] || !req.files[f][0]) {
          return res.status(400).json({ message: `${f} file is required` });
        }
      }

      if (String(body.termsAccepted) !== 'true') {
        return res.status(400).json({ message: 'You must accept the Terms and Conditions' });
      }

      const application = await Application.create({
        user: req.user._id,
        surname: body.surname,
        firstName: body.firstName,
        middleName: body.middleName,
        email: body.email || req.user.email,
        houseAddress: body.houseAddress,
        lga: body.lga,
        state: body.state,
        mobileNumber: body.mobileNumber,
        altNumber: body.altNumber,
        bvn: body.bvn,
        nin: body.nin,
        referredBy: body.referredBy,
        referralContact: body.referralContact,
        loanAmount: Number(body.loanAmount),
        purposes,
        purposeBreakdown: (purposeBreakdown || []).map((p) => ({
          purpose: p.purpose,
          amount: Number(p.amount),
        })),
        vendorSelections: (vendorSelections || []).map((v) => ({
          purpose: v.purpose,
          vendor: v.vendor,
        })),
        employerName: body.employerName,
        officeAddress: body.officeAddress,
        offerLetter: fileFromMulter(req.files.offerLetter?.[0]),
        bankStatement: fileFromMulter(req.files.bankStatement?.[0]),
        staffId: fileFromMulter(req.files.staffId?.[0]),
        validId: fileFromMulter(req.files.validId?.[0]),
        termsAccepted: true,
        status: 'received',
      });

      res.status(201).json({ application });
    } catch (err) {
      next(err);
    }
  });
});

router.get('/', protect, async (req, res, next) => {
  try {
    const list = await Application.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('vendorSelections.vendor', 'businessName partnerCode area category address');
    res.json({ applications: list });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/all', protect, requireStaff, async (req, res, next) => {
  try {
    const list = await Application.find()
      .sort({ createdAt: -1 })
      .populate('user', 'firstName surname email')
      .populate('vendorSelections.vendor', 'businessName partnerCode area category address');
    res.json({ applications: list });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/:id/status', protect, requireAdmin, async (req, res, next) => {
  try {
    const { status, statusNote, allowEdit } = req.body;
    const allowed = ['received', 'processing', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status === 'rejected' && !String(statusNote || '').trim()) {
      return res.status(400).json({ message: 'A reason is required when rejecting an application' });
    }
    const update = {
      status,
      statusNote: statusNote || '',
      allowEdit: status === 'rejected' ? !!allowEdit : false,
    };
    const updated = await Application.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'firstName surname email')
      .populate('vendorSelections.vendor', 'businessName partnerCode area category address');
    if (!updated) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', protect, (req, res, next) => {
  fileFields(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ message: uploadErr.message });
    try {
      const existing = await Application.findOne({ _id: req.params.id, user: req.user._id });
      if (!existing) return res.status(404).json({ message: 'Application not found' });
      if (existing.status !== 'rejected') {
        return res
          .status(400)
          .json({ message: 'Only rejected applications can be edited and resubmitted' });
      }
      if (!existing.allowEdit) {
        return res
          .status(403)
          .json({ message: 'This application is not open for editing. Contact support.' });
      }

      const body = req.body;

      let purposes = body.purposes;
      if (typeof purposes === 'string') {
        try { purposes = JSON.parse(purposes); } catch { purposes = [purposes]; }
      }
      let purposeBreakdown = body.purposeBreakdown;
      if (typeof purposeBreakdown === 'string') {
        try { purposeBreakdown = JSON.parse(purposeBreakdown); } catch { purposeBreakdown = []; }
      }
      let vendorSelections = body.vendorSelections;
      if (typeof vendorSelections === 'string') {
        try { vendorSelections = JSON.parse(vendorSelections); } catch { vendorSelections = []; }
      }

      Object.assign(existing, {
        surname: body.surname ?? existing.surname,
        firstName: body.firstName ?? existing.firstName,
        middleName: body.middleName ?? existing.middleName,
        email: body.email ?? existing.email,
        houseAddress: body.houseAddress ?? existing.houseAddress,
        lga: body.lga ?? existing.lga,
        state: body.state ?? existing.state,
        mobileNumber: body.mobileNumber ?? existing.mobileNumber,
        altNumber: body.altNumber ?? existing.altNumber,
        bvn: body.bvn ?? existing.bvn,
        nin: body.nin ?? existing.nin,
        referredBy: body.referredBy ?? existing.referredBy,
        referralContact: body.referralContact ?? existing.referralContact,
        loanAmount: body.loanAmount !== undefined ? Number(body.loanAmount) : existing.loanAmount,
        purposes: purposes ?? existing.purposes,
        purposeBreakdown: purposeBreakdown
          ? purposeBreakdown.map((p) => ({ purpose: p.purpose, amount: Number(p.amount) }))
          : existing.purposeBreakdown,
        vendorSelections: vendorSelections
          ? vendorSelections.map((v) => ({ purpose: v.purpose, vendor: v.vendor }))
          : existing.vendorSelections,
        employerName: body.employerName ?? existing.employerName,
        officeAddress: body.officeAddress ?? existing.officeAddress,
        status: 'received',
        statusNote: '',
        allowEdit: false,
      });

      if (req.files?.offerLetter?.[0]) existing.offerLetter = fileFromMulter(req.files.offerLetter[0]);
      if (req.files?.bankStatement?.[0]) existing.bankStatement = fileFromMulter(req.files.bankStatement[0]);
      if (req.files?.staffId?.[0]) existing.staffId = fileFromMulter(req.files.staffId[0]);
      if (req.files?.validId?.[0]) existing.validId = fileFromMulter(req.files.validId[0]);

      await existing.save();
      const populated = await Application.findById(existing._id)
        .populate('user', 'firstName surname email')
        .populate('vendorSelections.vendor', 'businessName partnerCode area category address');
      res.json({ application: populated });
    } catch (err) {
      next(err);
    }
  });
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'manager';
    const filter = isStaff
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };
    const app = await Application.findOne(filter)
      .populate('user', 'firstName surname email')
      .populate('vendorSelections.vendor', 'businessName partnerCode area category address');
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
