const express = require('express');
const { put } = require('@vercel/blob');
const Application = require('../models/Application');
const upload = require('../middleware/upload');
const { protect, requireAdmin, requireStaff } = require('../middleware/auth');

const router = express.Router();

const fileFields = upload.fields([
  { name: 'offerLetter', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'staffId', maxCount: 1 },
  { name: 'validId', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
]);

async function fileFromMulter(file, prefix) {
  if (!file) return undefined;
  const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobPath = `applications/${prefix}-${Date.now()}-${safeOriginal}`;
  const blob = await put(blobPath, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    addRandomSuffix: true,
  });
  return {
    originalName: file.originalname,
    filename: blob.pathname,
    mimetype: file.mimetype,
    size: file.size,
    path: blob.url,
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

      const employmentStatus = body.employmentStatus === 'not-working' ? 'not-working' : 'employed';

      const required =
        employmentStatus === 'employed'
          ? ['offerLetter', 'bankStatement', 'staffId', 'validId', 'proofOfAddress']
          : ['validId', 'proofOfAddress'];
      for (const f of required) {
        if (!req.files || !req.files[f] || !req.files[f][0]) {
          return res.status(400).json({ message: `${f} file is required` });
        }
      }

      if (employmentStatus === 'not-working') {
        if (!String(body.referenceName || '').trim() || !String(body.referencePhone || '').trim()) {
          return res
            .status(400)
            .json({ message: 'A valid reference (name and phone number) is required when you are not currently working' });
        }
      }

      if (String(body.termsAccepted) !== 'true') {
        return res.status(400).json({ message: 'You must accept the Terms and Conditions' });
      }

      const [offerLetter, bankStatement, staffId, validId, proofOfAddress] = await Promise.all([
        fileFromMulter(req.files.offerLetter?.[0], 'offerLetter'),
        fileFromMulter(req.files.bankStatement?.[0], 'bankStatement'),
        fileFromMulter(req.files.staffId?.[0], 'staffId'),
        fileFromMulter(req.files.validId?.[0], 'validId'),
        fileFromMulter(req.files.proofOfAddress?.[0], 'proofOfAddress'),
      ]);

      const application = await Application.create({
        user: req.user._id,
        surname: body.surname,
        firstName: body.firstName,
        middleName: body.middleName,
        email: body.email || req.user.email,
        houseAddress: body.houseAddress,
        country: body.country || 'Nigeria',
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
        employmentStatus,
        employerName: employmentStatus === 'employed' ? body.employerName : '',
        officeAddress: employmentStatus === 'employed' ? body.officeAddress : '',
        referenceName: employmentStatus === 'not-working' ? body.referenceName : '',
        referenceRelationship: employmentStatus === 'not-working' ? body.referenceRelationship : '',
        referencePhone: employmentStatus === 'not-working' ? body.referencePhone : '',
        offerLetter,
        bankStatement,
        staffId,
        validId,
        proofOfAddress,
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
        country: body.country ?? existing.country,
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
        employmentStatus: body.employmentStatus ?? existing.employmentStatus,
        employerName: body.employerName ?? existing.employerName,
        officeAddress: body.officeAddress ?? existing.officeAddress,
        referenceName: body.referenceName ?? existing.referenceName,
        referenceRelationship: body.referenceRelationship ?? existing.referenceRelationship,
        referencePhone: body.referencePhone ?? existing.referencePhone,
        status: 'received',
        statusNote: '',
        allowEdit: false,
      });

      if (req.files?.offerLetter?.[0]) existing.offerLetter = await fileFromMulter(req.files.offerLetter[0], 'offerLetter');
      if (req.files?.bankStatement?.[0]) existing.bankStatement = await fileFromMulter(req.files.bankStatement[0], 'bankStatement');
      if (req.files?.staffId?.[0]) existing.staffId = await fileFromMulter(req.files.staffId[0], 'staffId');
      if (req.files?.validId?.[0]) existing.validId = await fileFromMulter(req.files.validId[0], 'validId');
      if (req.files?.proofOfAddress?.[0]) existing.proofOfAddress = await fileFromMulter(req.files.proofOfAddress[0], 'proofOfAddress');

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
