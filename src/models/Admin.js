const mongoose = require('mongoose');
const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, trim: true, maxlength: 30 },
  passwordHash: { type: String, required: true, select: false },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  lastLoginAt: Date,
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
AdminSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model('Admin', AdminSchema);
