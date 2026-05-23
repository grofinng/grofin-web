const express = require('express');
const ImpactStat = require('../models/ImpactStat');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public — anyone can read the active stats for the homepage
router.get('/', async (_req, res, next) => {
  try {
    const stats = await ImpactStat.find({ active: true }).sort({ order: 1, createdAt: 1 });
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// Admin — list all (including inactive)
router.get('/all', protect, requireAdmin, async (_req, res, next) => {
  try {
    const stats = await ImpactStat.find().sort({ order: 1, createdAt: 1 });
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const { key, label, value, icon, order, active } = req.body;
    if (!key || !label || !value) {
      return res.status(400).json({ message: 'Key, label, and value are required' });
    }
    const exists = await ImpactStat.findOne({ key });
    if (exists) return res.status(409).json({ message: `Key "${key}" already exists` });
    const stat = await ImpactStat.create({
      key,
      label,
      value,
      icon: icon || 'chart',
      order: order ?? 0,
      active: active !== false,
    });
    res.status(201).json({ stat });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const { label, value, icon, order, active } = req.body;
    const update = {};
    if (label !== undefined) update.label = label;
    if (value !== undefined) update.value = value;
    if (icon !== undefined) update.icon = icon;
    if (order !== undefined) update.order = order;
    if (active !== undefined) update.active = !!active;
    const stat = await ImpactStat.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!stat) return res.status(404).json({ message: 'Stat not found' });
    res.json({ stat });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const stat = await ImpactStat.findByIdAndDelete(req.params.id);
    if (!stat) return res.status(404).json({ message: 'Stat not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
