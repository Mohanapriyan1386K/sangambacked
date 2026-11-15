const mongoose = require('mongoose');
const EventExpenseSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  amount: { type: Number, required: true, min: 0.01 },
  spentAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['posted', 'void'], default: 'posted' },
  voidReason: { type: String, maxlength: 500 },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });
module.exports = mongoose.model('EventExpense', EventExpenseSchema);
