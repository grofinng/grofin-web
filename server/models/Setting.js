const mongoose = require('mongoose');

// Key/value store for admin-editable platform settings. One document per
// key; `value` holds whatever shape that setting needs.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'settings' }
);

module.exports = mongoose.model('Setting', settingSchema);
