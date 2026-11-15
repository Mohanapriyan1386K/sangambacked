const mongoose = require('mongoose');
const crypto = require('node:crypto');
const Payment = require('../models/Payment');
const MonthlyDue = require('../models/MonthlyDue');
const Member = require('../models/Member');
const ApiError = require('../utils/ApiError');
const { paged } = require('../utils/pagination');
const { parseMonth, currentMonth } = require('../utils/date');
const audit = require('../utils/audit');

async function postPayment(data, actor, req) {
  parseMonth(data.dueMonth);
  if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) throw new ApiError(400, 'amount must be greater than zero');
  const due = await MonthlyDue.findOne({ _id: data.dueId, memberId: data.memberId, dueMonth: data.dueMonth });
  if (!due) throw new ApiError(404, 'Monthly due not found for this member and month');
  if (Number(data.amount) > Math.max(0, due.dueAmount + due.adjustments - due.paidAmount)) {
    throw new ApiError(409, 'Payment exceeds this due. Create an explicit advance due before recording the excess.');
  }
  const session = await mongoose.startSession();
  let payment;
  try {
    await session.withTransaction(async () => {
      const freshDue = await MonthlyDue.findById(due._id).session(session);
      if (Number(data.amount) > Math.max(0, freshDue.dueAmount + freshDue.adjustments - freshDue.paidAmount)) throw new ApiError(409, 'Due balance changed; refresh and retry');
      [payment] = await Payment.create([{ memberId: data.memberId, dueId: due._id, dueMonth: data.dueMonth,
        amount: Number(data.amount), paidAt: data.paidAt || new Date(), mode: data.mode || 'cash',
        note: data.note, receiptNo: data.receiptNo || `SG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, enteredBy: actor._id }], { session });
      freshDue.paidAmount += Number(data.amount);
      freshDue.status = freshDue.paidAmount >= freshDue.dueAmount + freshDue.adjustments
        ? (data.dueMonth > currentMonth() ? 'advance' : 'paid') : 'partial';
      await freshDue.save({ session });
    });
  } finally { await session.endSession(); }
  await audit(actor._id, 'payments.create', 'payment', payment._id, { receiptNo: payment.receiptNo, amount: payment.amount }, req);
  return payment;
}
async function voidPayment(id, reason, actor, req) {
  if (!reason || !String(reason).trim()) throw new ApiError(400, 'A void reason is required');
  const session = await mongoose.startSession();
  let payment;
  try {
    await session.withTransaction(async () => {
      payment = await Payment.findOne({ _id: id, status: 'posted' }).session(session);
      if (!payment) throw new ApiError(404, 'Posted payment not found');
      const due = await MonthlyDue.findById(payment.dueId).session(session);
      if (!due || due.paidAmount < payment.amount) throw new ApiError(409, 'Payment and due totals are inconsistent');
      due.paidAmount -= payment.amount;
      due.status = due.paidAmount <= 0 ? 'pending' : due.paidAmount >= due.dueAmount + due.adjustments
        ? (due.dueMonth > currentMonth() ? 'advance' : 'paid') : 'partial';
      await due.save({ session });
      payment.status = 'void'; payment.voidReason = String(reason).trim();
      await payment.save({ session });
    });
  } finally { await session.endSession(); }
  await audit(actor._id, 'payments.void', 'payment', payment._id, { reason }, req);
  return payment;
}
async function listPayments(query) {
  const filter = { status: query.status || 'posted' };
  if (query.memberId) filter.memberId = query.memberId;
  if (query.dueMonth) filter.dueMonth = parseMonth(query.dueMonth);
  if (query.from || query.to) filter.paidAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) };
  return paged(Payment, filter, query, { sort: { paidAt: -1 } });
}
async function calendar(memberId, year) {
  if (!/^\d{4}$/.test(String(year))) throw new ApiError(400, 'year must have four digits');
  if (!await Member.exists({ _id: memberId })) throw new ApiError(404, 'Member not found');
  const dues = await MonthlyDue.find({ memberId, dueMonth: { $gte: `${year}-01`, $lte: `${year}-12` } }).sort({ dueMonth: 1 }).lean();
  return Array.from({ length: 12 }, (_, i) => {
    const dueMonth = `${year}-${String(i + 1).padStart(2, '0')}`;
    const due = dues.find((row) => row.dueMonth === dueMonth);
    return { dueMonth, status: due?.status || 'not_generated', dueAmount: due?.dueAmount || 0, paidAmount: due?.paidAmount || 0, balance: due ? Math.max(0, due.dueAmount + due.adjustments - due.paidAmount) : 0 };
  });
}
module.exports = { postPayment, voidPayment, listPayments, calendar };
