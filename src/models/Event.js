const mongoose = require('mongoose');
const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, maxlength: 12000 },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 300 },
  coverImage: { url: String, alt: String },
  gallery: [{ url: String, alt: String }],
  organizerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft', index: true },
  publishedAt: Date,
}, { timestamps: true });
EventSchema.index({ status: 1, startsAt: 1 });
module.exports = mongoose.model('Event', EventSchema);
