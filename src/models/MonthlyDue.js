const mongoose = require('mongoose');
const MonthlyDueSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  dueMonth: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  dueAmount: { type: Number, required: true, min: 0 },
  adjustments: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['pending', 'partial', 'paid', 'advance'], default: 'pending', index: true },
}, { timestamps: true });
MonthlyDueSchema.index({ memberId: 1, dueMonth: 1 }, { unique: true });
MonthlyDueSchema.virtual('balance').get(function balance() { return Math.max(0, this.dueAmount + this.adjustments - this.paidAmount); });
module.exports = mongoose.model('MonthlyDue', MonthlyDueSchema);
