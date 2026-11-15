const mongoose = require('mongoose');
let connectionPromise;

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) return mongoose.connection.asPromise();
  if (connectionPromise) return connectionPromise;

  mongoose.set('strictQuery', true);
  connectionPromise = mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10000,
  }).then(() => mongoose.connection).catch((error) => {
    connectionPromise = undefined;
    throw error;
  });
  return connectionPromise;
}

mongoose.connection.on('disconnected', () => { connectionPromise = undefined; });

module.exports = connectDatabase;
