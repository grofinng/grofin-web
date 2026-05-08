const connectDB = require('../server/config/db');
const app = require('../server/server');

let dbReady;

module.exports = async (req, res) => {
  try {
    if (!dbReady) dbReady = connectDB();
    await dbReady;
    return app(req, res);
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: err.message || 'Server failed to initialise' }));
  }
};
