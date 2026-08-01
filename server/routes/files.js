const express = require('express');
const { get } = require('@vercel/blob');
const { Readable } = require('stream');
const { protect, requireStaff } = require('../middleware/auth');

const router = express.Router();

const BLOB_ACCESS = process.env.BLOB_ACCESS === 'public' ? 'public' : 'private';

// Streams a document from the (private) Blob store to an authenticated staff
// member. Private blob URLs are not fetchable directly from the browser, so
// the admin UI downloads files through this route.
router.get('/', protect, requireStaff, async (req, res, next) => {
  try {
    const pathname = String(req.query.path || '');
    if (!pathname) return res.status(400).json({ message: 'path is required' });

    const blob = await get(pathname, { access: BLOB_ACCESS });
    if (!blob || !blob.stream) return res.status(404).json({ message: 'File not found' });

    if (blob.contentType) res.setHeader('Content-Type', blob.contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=300');

    const stream = typeof blob.stream.pipe === 'function' ? blob.stream : Readable.fromWeb(blob.stream);
    stream.pipe(res);
    stream.on('error', next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
