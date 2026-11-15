const mongoose = require('mongoose');
const PaymentSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  dueId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyDue', required: true, index: true },
  dueMonth: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paidAt: { type: Date, required: true, default: Date.now, index: true },
  mode: { type: String, enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'], default: 'cash' },
  receiptNo: { type: String, required: true, unique: true },
  note: { type: String, maxlength: 500 },
  status: { type: String, enum: ['posted', 'void'], default: 'posted', index: true },
  voidReason: { type: String, maxlength: 500 },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });
PaymentSchema.index({ paidAt: 1, status: 1 });
module.exports = mongoose.model('Payment', PaymentSchema);
