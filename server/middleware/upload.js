const multer = require('multer');

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, PNG, or JPG files are allowed'));
  },
});

module.exports = upload;
