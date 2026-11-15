const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  donorName: { type: String, trim: true, maxlength: 120 },
  amount: { type: Number, required: true, min: 0.01 },
  donatedAt: { type: Date, required: true, default: Date.now, index: true },
  mode: { type: String, enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'], default: 'cash' },
  receiptNo: { type: String, required: true, unique: true },
  note: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['posted', 'void'], default: 'posted', index: true },
  voidReason: { type: String, trim: true, maxlength: 500 },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

DonationSchema.index({ donatedAt: -1, status: 1 });
DonationSchema.index({ eventId: 1, donatedAt: -1, status: 1 });
module.exports = mongoose.model('Donation', DonationSchema);
