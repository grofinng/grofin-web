const mongoose = require('mongoose');

const STATUSES = ['pending', 'resolved'];

const contactRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true, collection: 'contactRequests' }
);

module.exports = mongoose.model('ContactRequest', contactRequestSchema);
module.exports.STATUSES = STATUSES;
