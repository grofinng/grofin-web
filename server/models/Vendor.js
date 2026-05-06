const mongoose = require('mongoose');

const VENDOR_CATEGORIES = ['Pharmacy', 'Grocery'];

const PURPOSE_TO_CATEGORY = {
  Groceries: 'Grocery',
  Medications: 'Pharmacy',
};

const vendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    contactPhone: { type: String, trim: true, default: '' },
    area: { type: String, required: true, trim: true },
    category: { type: String, enum: VENDOR_CATEGORIES, required: true },
    partnerCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'vendors' }
);

vendorSchema.index({ category: 1, active: 1, businessName: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
module.exports.VENDOR_CATEGORIES = VENDOR_CATEGORIES;
module.exports.PURPOSE_TO_CATEGORY = PURPOSE_TO_CATEGORY;
