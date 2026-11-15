const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const app = express();

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

app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ success: mongoose.connection.readyState === 1, data: { status: mongoose.connection.readyState === 1 ? 'ok' : 'database_unavailable', database: mongoose.connection.readyState } }));
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
