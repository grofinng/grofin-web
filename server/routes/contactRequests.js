const express = require('express');
const ContactRequest = require('../models/ContactRequest');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public — anyone can submit
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }
    const created = await ContactRequest.create({
      name,
      email,
      phone: phone || '',
      subject: subject || '',
      message,
    });
    res.status(201).json({ request: created });
  } catch (err) {
    next(err);
  }
});

// Admin — list
router.get('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await ContactRequest.find(filter).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// Admin — mark resolved / add an internal note
router.patch('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const update = {};
    if (status !== undefined) {
      if (!['pending', 'resolved'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      update.status = status;
    }
    if (adminNote !== undefined) update.adminNote = adminNote;
    const updated = await ContactRequest.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
