const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const bootstrap = require('./services/bootstrapService');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const app = express();
let bootstrapPromise;

async function initializeDatabase() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in the backend deployment environment');
  await connectDatabase();
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((error) => {
      bootstrapPromise = undefined;
      throw error;
    });
  }
  await bootstrapPromise;
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
app.use((req, res, next) => {
  req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.locals.initializeDatabase = initializeDatabase;
app.get('/api/health', async (req, res) => {
  try {
    await connectDatabase();
    return res.status(200).json({ success: true, data: { status: 'ok', database: mongoose.connection.readyState } });
  } catch (error) {
    console.error('Database health check failed:', { name: error.name, code: error.code, message: error.message });
    return res.status(503).json({ success: false, data: { status: 'database_unavailable', database: mongoose.connection.readyState } });
  }
});
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', { name: error.name, code: error.code, message: error.message });
    res.status(503).json({
      success: false,
      error: { message: 'Database unavailable. Check the backend MongoDB connection and deployment logs.', requestId: req.id },
    });
  }
});
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/roles', require('./routes/roleRoutes'));
app.use('/api/v1/members', require('./routes/memberRoutes'));
app.use('/api/v1', require('./routes/collectionRoutes'));
app.use('/api/v1/events', require('./routes/eventRoutes'));
app.use('/api/v1/public', require('./routes/publicRoutes'));
app.use('/api/v1', require('./routes/systemRoutes'));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
