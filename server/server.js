require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const userRoutes = require('./routes/users');
const vendorRoutes = require('./routes/vendors');

const app = express();

const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// On Vercel the runtime auto-parses JSON / urlencoded bodies onto req.body
// and consumes the request stream. Running express.json() after that hangs
// the stream forever. Skip body parsers in serverless; the route handlers
// already use req.body which Vercel populates.
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerless) {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'grofin-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`GroFin API listening on :${PORT}`));
  });
}
