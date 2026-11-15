const reports = require('../services/reportService');
const eventService = require('../services/eventService');
const EventExpense = require('../models/EventExpense');
const { paged } = require('../utils/pagination');
const ApiError = require('../utils/ApiError');
const cloudinary = require('../config/cloudinary');
async function settings(req, res) { res.json({ success: true, data: await reports.getSettings() }); }
async function updateSettings(req, res) { res.json({ success: true, data: await reports.updateSettings(req.body, req.admin, req) }); }
async function publicSettings(req, res) {
  const s = await reports.getSettings();
  res.json({ success: true, data: s && { name: s.name, logoUrl: s.logoUrl, about: s.about, contactEmail: s.contactEmail, contactPhone: s.contactPhone, address: s.address } });
}
async function auditLogs(req, res) { res.json({ success: true, data: await reports.listAudit(req.query) }); }
async function expenseReport(req, res) { res.json({ success: true, data: await reports.expenseReport(req.query.eventId, req.query) }); }
async function uploads(req, res) {
  if (!cloudinary.isConfigured()) throw new ApiError(503, 'Cloudinary is not configured; set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
  const contexts = new Set(['events', 'organizers', 'settings']);
  const context = contexts.has(req.body.context) ? req.body.context : 'events';
  const rootFolder = String(process.env.CLOUDINARY_FOLDER || 'sangam').replace(/^\/+|\/+$/g, '');
  let result;
  try {
    result = await cloudinary.uploadImage(req.file.buffer, { folder: `${rootFolder}/${context}` });
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    throw new ApiError(502, 'Cloudinary could not store this image');
  }
  res.status(201).json({ success: true, data: {
    publicId: result.public_id,
    url: result.secure_url,
    alt: req.body.alt.trim(),
    mimeType: req.file.mimetype,
    size: req.file.size,
    width: result.width,
    height: result.height,
    format: result.format,
  } });
}
module.exports = { settings, updateSettings, publicSettings, auditLogs, expenseReport, uploads };
