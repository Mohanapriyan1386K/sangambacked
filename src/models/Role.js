const mongoose = require('mongoose');
const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
  permissions: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });
RoleSchema.index({ name: 1 }, { unique: true });
module.exports = mongoose.model('Role', RoleSchema);
