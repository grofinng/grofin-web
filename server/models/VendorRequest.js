const mongoose = require('mongoose');

const VENDOR_CATEGORIES = ['Pharmacy', 'Grocery'];
const STATUSES = ['pending', 'approved', 'rejected'];

const vendorRequestSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    contactPhone: { type: String, trim: true, default: '' },

    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    notes: { type: String, trim: true, default: '' },

    status: { type: String, enum: STATUSES, default: 'pending' },
    adminNote: { type: String, default: '' },
    approvedVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  },
  { timestamps: true, collection: 'vendorRequests' }
);

module.exports = mongoose.model('VendorRequest', vendorRequestSchema);
module.exports.VENDOR_CATEGORIES = VENDOR_CATEGORIES;
module.exports.STATUSES = STATUSES;
