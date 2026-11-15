const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
function notFound(req, res, next) { next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`)); }
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    details = Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }));
    message = 'Validation failed';
  } else if (err instanceof mongoose.Error.CastError) { status = 400; message = 'Invalid value'; }
  else if (err.code === 11000) { status = 409; message = `Duplicate value for ${Object.keys(err.keyPattern || {}).join(', ')}`; }
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}), requestId: req.id } });
}
module.exports = { notFound, errorHandler };
