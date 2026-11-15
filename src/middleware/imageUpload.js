const multer = require('multer');
const ApiError = require('../utils/ApiError');

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024;
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1, fields: 3, parts: 4 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) return callback(new ApiError(400, 'Image must be JPEG, PNG, or WebP'));
    callback(null, true);
  },
}).single('file');

function detectedMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function imageUpload(req, res, next) {
  parseImage(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, `Image must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller`));
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') return next(new ApiError(400, 'Upload exactly one image using the file field'));
      return next(error.status ? error : new ApiError(400, error.message || 'Invalid image upload'));
    }
    if (!req.file) return next(new ApiError(400, 'Choose an image to upload'));
    const actualType = detectedMime(req.file.buffer);
    if (!actualType || actualType !== req.file.mimetype) return next(new ApiError(400, 'Image content does not match its file type'));
    if (typeof req.body.alt !== 'string' || !req.body.alt.trim()) return next(new ApiError(400, 'Accessible alt text is required'));
    if (req.body.alt.length > 250) return next(new ApiError(400, 'Alt text must be 250 characters or fewer'));
    next();
  });
}

module.exports = imageUpload;
