const mongoose = require('mongoose');

const ICONS = ['chart', 'box', 'trending', 'meal', 'naira', 'users', 'home', 'leaf'];

const impactStatSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    icon: { type: String, enum: ICONS, default: 'chart' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'impactStats' }
);

module.exports = mongoose.model('ImpactStat', impactStatSchema);
module.exports.ICONS = ICONS;
