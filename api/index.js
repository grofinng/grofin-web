const serverless = require('serverless-http');
const connectDB = require('../server/config/db');
const app = require('../server/server');

const handler = serverless(app);

module.exports = async (req, res) => {
  try {
    await connectDB();
    return handler(req, res);
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: 'Server failed to initialise' }));
  }
};
