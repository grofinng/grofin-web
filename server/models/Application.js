const mongoose = require('mongoose');

const PURPOSES = ['Groceries', 'Medications', 'Other'];
const STATUSES = ['received', 'processing', 'approved', 'rejected'];

const purposeBreakdownSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: PURPOSES, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const vendorSelectionSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: PURPOSES, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    mimetype: String,
    size: Number,
    path: String,
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    surname: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true },
    houseAddress: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: 'Nigeria' },
    lga: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    altNumber: { type: String, trim: true, default: '' },
    bvn: { type: String, required: true, trim: true, match: [/^\d{11}$/, 'BVN must be 11 digits'] },
    nin: { type: String, required: true, trim: true, match: [/^\d{11}$/, 'NIN must be 11 digits'] },
    referredBy: { type: String, required: true, trim: true },
    referralContact: { type: String, required: true, trim: true },

    loanAmount: { type: Number, required: true, min: 1 },
    interestRate: { type: Number, default: 20, min: 0 },
    purposes: {
      type: [String],
      enum: PURPOSES,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Select at least one purpose',
      },
    },
    purposeBreakdown: {
      type: [purposeBreakdownSchema],
      default: [],
    },
    vendorSelections: {
      type: [vendorSelectionSchema],
      default: [],
    },

    employmentStatus: {
      type: String,
      enum: ['employed', 'not-working'],
      default: 'employed',
    },
    employerName: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'employed';
      },
    },
    officeAddress: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'employed';
      },
    },
    referenceName: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'not-working';
      },
    },
    referenceRelationship: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'not-working';
      },
    },
    referencePhone: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'not-working';
      },
    },
    referenceAddress: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.employmentStatus === 'not-working';
      },
    },

    // Payout account — required when the loan purpose is 'Other'
    accountNumber: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return (this.purposes || []).includes('Other');
      },
      validate: {
        validator: function (v) {
          if (!(this.purposes || []).includes('Other')) return true;
          return /^\d{10}$/.test(v || '');
        },
        message: 'Account number must be 10 digits',
      },
    },
    bankName: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return (this.purposes || []).includes('Other');
      },
    },
    accountName: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return (this.purposes || []).includes('Other');
      },
    },

    offerLetter: fileSchema,
    bankStatement: fileSchema,
    staffId: fileSchema,
    validId: fileSchema,
    proofOfAddress: fileSchema,

    termsAccepted: { type: Boolean, required: true },

    status: { type: String, enum: STATUSES, default: 'received' },
    statusNote: { type: String, default: '' },
    allowEdit: { type: Boolean, default: false },

    // Set by the admin on approval: where the customer repays, and when.
    approvedAt: { type: Date },
    dueDate: { type: Date },
    repaymentBank: { type: String, trim: true, default: '' },
    repaymentAccountNumber: { type: String, trim: true, default: '' },
    repaymentAccountName: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'applications' }
);

applicationSchema.pre('validate', function (next) {
  if (!this.purposes || this.purposes.length === 0) return next();

  const breakdown = this.purposeBreakdown || [];
  const breakdownPurposes = breakdown.map((b) => b.purpose);

  const missing = this.purposes.filter((p) => !breakdownPurposes.includes(p));
  if (missing.length) {
    return next(new Error(`Missing breakdown amounts for: ${missing.join(', ')}`));
  }

  const extra = breakdownPurposes.filter((p) => !this.purposes.includes(p));
  if (extra.length) {
    return next(new Error(`Breakdown contains purposes not selected: ${extra.join(', ')}`));
  }

  const sum = breakdown.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  if (Math.round(sum) !== Math.round(this.loanAmount)) {
    return next(
      new Error(
        `Purpose breakdown total (₦${sum.toLocaleString()}) must equal loan amount (₦${Number(
          this.loanAmount
        ).toLocaleString()})`
      )
    );
  }

  const selections = this.vendorSelections || [];
  const selectedPurposes = selections.map((s) => s.purpose);
  // 'Other' is paid to the applicant's account, so no vendor is required.
  const missingVendor = this.purposes.filter((p) => p !== 'Other' && !selectedPurposes.includes(p));
  if (missingVendor.length) {
    return next(new Error(`Select a vendor for: ${missingVendor.join(', ')}`));
  }
  const extraVendor = selectedPurposes.filter((p) => !this.purposes.includes(p));
  if (extraVendor.length) {
    return next(new Error(`Vendor selected for purposes not chosen: ${extraVendor.join(', ')}`));
  }

  next();
});

module.exports = mongoose.model('Application', applicationSchema);
module.exports.PURPOSES = PURPOSES;
module.exports.STATUSES = STATUSES;
