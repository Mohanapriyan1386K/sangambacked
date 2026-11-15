const mongoose = require('mongoose');
const MemberSchema = new mongoose.Schema({
  memberCode: { type: String, required: true, trim: true, uppercase: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String, trim: true, maxlength: 500 },
  joinDate: { type: Date, required: true, default: Date.now },
  firstDueMonth: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  monthlyFee: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  stopDueMonth: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  notes: { type: String, maxlength: 1000 },
}, { timestamps: true });
MemberSchema.index({ memberCode: 1 }, { unique: true });
MemberSchema.index({ name: 'text', phone: 'text', memberCode: 'text' });
module.exports = mongoose.model('Member', MemberSchema);
