const express = require('express');
const User = require('../models/User');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/notify-recipients', protect, async (_req, res, next) => {
  try {
    const recipients = await User.find({
      role: { $in: ['admin', 'manager'] },
      receiveApplicationEmails: true,
    }).select('email firstName surname');
    res.json({ recipients });
  } catch (err) {
    next(err);
  }
});

router.get('/', protect, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'manager'] } })
      .sort({ createdAt: -1 })
      .select('firstName surname email role createdAt receiveApplicationEmails');
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const { receiveApplicationEmails } = req.body;
    const update = {};
    if (receiveApplicationEmails !== undefined) {
      update.receiveApplicationEmails = !!receiveApplicationEmails;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('firstName surname email role createdAt receiveApplicationEmails');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const { firstName, surname, email, password, role, receiveApplicationEmails } = req.body;
    if (!firstName || !surname || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['manager', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be manager or admin' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({
      firstName,
      surname,
      email,
      password,
      role,
      receiveApplicationEmails: !!receiveApplicationEmails,
    });
    res.status(201).json({ user: user.toSafe() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    if (String(req.user._id) === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'user') {
      return res.status(400).json({ message: 'Use a customer account workflow to remove customers' });
    }
    await user.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
