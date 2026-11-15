const mongoose = require('mongoose');
const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  entityId: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: String,
  userAgent: String,
}, { timestamps: true });
AuditLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model('AuditLog', AuditLogSchema);
