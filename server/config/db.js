const mongoose = require('mongoose');

const cache = global.__esena_mongo || (global.__esena_mongo = { conn: null, promise: null });

async function connectDB() {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri).then((m) => {
      console.log('MongoDB connected');
      return m;
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

module.exports = connectDB;
