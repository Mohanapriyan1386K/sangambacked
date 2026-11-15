const ApiError = require('../utils/ApiError');
const objectIdPattern = /^[a-f\d]{24}$/i;
function validateId(req, res, next) {
  if (!objectIdPattern.test(req.params.id || '')) return next(new ApiError(400, 'Invalid resource id'));
  next();
}
function validateBody(required = []) {
  return (req, res, next) => {
    if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object') return next(new ApiError(400, 'A JSON object body is required'));
    const missing = required.filter((field) => req.body[field] === undefined || req.body[field] === '');
    if (missing.length) return next(new ApiError(400, `Required fields missing: ${missing.join(', ')}`));
    next();
  };
}
function rateLimit({ windowMs = 15 * 60_000, max = 10 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) hits.set(key, { count: 1, resetAt: now + windowMs });
    else if (++entry.count > max) return next(new ApiError(429, 'Too many attempts. Try again later.'));
    res.set('RateLimit-Limit', String(max));
    next();
  };
}
module.exports = { validateId, validateBody, rateLimit };
