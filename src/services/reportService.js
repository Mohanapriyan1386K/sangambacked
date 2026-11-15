const Member = require('../models/Member');
const MonthlyDue = require('../models/MonthlyDue');
const Payment = require('../models/Payment');
const EventExpense = require('../models/EventExpense');
const Donation = require('../models/Donation');
const Event = require('../models/Event');
const SangamSetting = require('../models/SangamSetting');
const ApiError = require('../utils/ApiError');
const { currentMonth, parseMonth, monthStart, nextMonth } = require('../utils/date');
const { paged } = require('../utils/pagination');
const audit = require('../utils/audit');

async function collectionReport(month) {
  month = parseMonth(month || currentMonth());
  const [dues, payments, members] = await Promise.all([
    MonthlyDue.aggregate([{ $match: { dueMonth: month } }, { $group: { _id: null, expected: { $sum: { $add: ['$dueAmount', '$adjustments'] } }, paid: { $sum: '$paidAmount' }, paidMembers: { $sum: { $cond: [{ $gte: ['$paidAmount', { $add: ['$dueAmount', '$adjustments'] }] }, 1, 0] } }, partialMembers: { $sum: { $cond: [{ $and: [{ $gt: ['$paidAmount', 0] }, { $lt: ['$paidAmount', { $add: ['$dueAmount', '$adjustments'] }] }] }, 1, 0] } }, pendingMembers: { $sum: { $cond: [{ $eq: ['$paidAmount', 0] }, 1, 0] } } } }]),
    Payment.aggregate([{ $match: { status: 'posted', paidAt: { $gte: monthStart(month), $lt: monthStart(nextMonth(month)) } } }, { $group: { _id: null, cashflow: { $sum: '$amount' } } }]),
    Member.find({ firstDueMonth: { $lte: month }, $and: [
      { $or: [{ status: 'active' }, { status: 'inactive', stopDueMonth: { $gte: month } }] },
      { $or: [{ stopDueMonth: null }, { stopDueMonth: { $gte: month } }] },
    ] }).select('monthlyFee').lean(),
  ]);
  const row = dues[0] || { expected: 0, paid: 0, paidMembers: 0, partialMembers: 0, pendingMembers: 0 };
  const expected = members.reduce((sum, member) => sum + member.monthlyFee, 0);
  return { month, eligibleMembers: members.length, expected, collectedForDueMonth: row.paid, cashflowByPaymentDate: payments[0]?.cashflow || 0, pending: Math.max(0, expected - row.paid), paidMembers: row.paidMembers, partialMembers: row.partialMembers, pendingMembers: Math.max(0, members.length - row.paidMembers - row.partialMembers) };
}
async function dashboard(month) {
  const selectedMonth = parseMonth(month || currentMonth());
  const [collections, events, recentPayments, expenses, donationTotals, recentDonations] = await Promise.all([
    collectionReport(selectedMonth),
    Event.find({ status: 'published', endsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(5).select('title slug startsAt endsAt venue coverImage').lean(),
    Payment.find({ status: 'posted' }).sort({ paidAt: -1 }).limit(5).populate('memberId', 'memberCode name').select('memberId amount dueMonth paidAt receiptNo').lean(),
    EventExpense.find({ status: 'posted' }).sort({ spentAt: -1 }).limit(5).populate('eventId', 'title').select('eventId category amount spentAt').lean(),
    Donation.aggregate([{ $match: { status: 'posted', donatedAt: { $gte: monthStart(selectedMonth), $lt: monthStart(nextMonth(selectedMonth)) } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Donation.find({ status: 'posted' }).sort({ donatedAt: -1 }).limit(5).populate('eventId', 'title').select('eventId donorName amount donatedAt mode receiptNo').lean(),
  ]);
  return { ...collections, donationsThisMonth: donationTotals[0]?.amount || 0, donationCountThisMonth: donationTotals[0]?.count || 0, upcomingEvents: events, recentPayments, recentDonations, latestExpenses: expenses };
}
async function listDues(query) {
  const filter = {};
  if (query.month) filter.dueMonth = parseMonth(query.month);
  if (query.memberId) filter.memberId = query.memberId;
  if (query.status) filter.status = query.status;
  return paged(MonthlyDue, filter, query, { sort: { dueMonth: -1 } });
}
async function exportCollections(month) {
  month = parseMonth(month || currentMonth());
  const rows = await MonthlyDue.find({ dueMonth: month }).sort({ dueMonth: 1 }).populate('memberId', 'memberCode name phone').lean();
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [['Member Code', 'Member Name', 'Phone', 'Due Month', 'Due Amount', 'Paid Amount', 'Balance', 'Status'], ...rows.map((due) => [
    due.memberId?.memberCode, due.memberId?.name, due.memberId?.phone, due.dueMonth,
    due.dueAmount + due.adjustments, due.paidAmount, Math.max(0, due.dueAmount + due.adjustments - due.paidAmount), due.status,
  ])];
  return { month, csv: lines.map((line) => line.map(cell).join(',')).join('\r\n') };
}
async function listAudit(query) {
  const AuditLog = require('../models/AuditLog');
  const filter = {};
  if (query.actorId) filter.actorId = query.actorId;
  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = query.action;
  return paged(AuditLog, filter, query, { sort: { createdAt: -1 } });
}
async function getSettings() { return SangamSetting.findOne({ key: 'main' }).lean(); }
async function updateSettings(data, actor, req) {
  const allowed = ['name', 'logoUrl', 'about', 'contactEmail', 'contactPhone', 'address', 'monthlyFee', 'timezone'];
  const updates = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.includes(key)));
  const settings = await SangamSetting.findOneAndUpdate({ key: 'main' }, { $set: updates }, { new: true, runValidators: true, upsert: true });
  await audit(actor._id, 'settings.update', 'settings', settings._id, { fields: Object.keys(updates) }, req);
  return settings;
}
async function expenseReport(eventId, query) {
  const filter = { ...(eventId ? { eventId } : {}), status: 'posted' };
  if (!eventId && query.from) filter.spentAt = { $gte: new Date(query.from), ...(query.to ? { $lte: new Date(query.to) } : {}) };
  const rows = await EventExpense.find(filter).sort({ spentAt: -1 }).populate('eventId', 'title').lean();
  return { total: rows.reduce((sum, row) => sum + row.amount, 0), items: rows };
}
module.exports = { collectionReport, dashboard, listDues, exportCollections, listAudit, getSettings, updateSettings, expenseReport };
