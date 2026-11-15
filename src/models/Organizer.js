const mongoose = require('mongoose');
const OrganizerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, trim: true, maxlength: 100 },
  photo: { url: String, alt: String },
  isPublic: { type: Boolean, default: false },
  publicConsentAt: Date,
  contact: { type: String, select: false, maxlength: 100 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
module.exports = mongoose.model('Organizer', OrganizerSchema);
