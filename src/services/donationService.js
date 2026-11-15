const crypto = require('node:crypto');
const Donation = require('../models/Donation');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { paged } = require('../utils/pagination');
const audit = require('../utils/audit');

async function listEventDonations(eventId, query = {}) {
  if (!await Event.exists({ _id: eventId })) throw new ApiError(404, 'Event not found');
  const filter = { eventId, ...(query.status ? { status: query.status } : {}) };
  const [result, totals] = await Promise.all([
    paged(Donation, filter, query, { sort: { donatedAt: -1 } }),
    Donation.aggregate([{ $match: { eventId: require('mongoose').Types.ObjectId.createFromHexString(String(eventId)), status: 'posted' } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);
  return { ...result, totalAmount: totals[0]?.amount || 0, postedCount: totals[0]?.count || 0 };
}

async function createEventDonation(eventId, data, actor, req) {
  if (!await Event.exists({ _id: eventId })) throw new ApiError(404, 'Event not found');
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'amount must be greater than zero');
  const donatedAt = data.donatedAt ? new Date(data.donatedAt) : new Date();
  if (Number.isNaN(donatedAt.getTime())) throw new ApiError(400, 'donatedAt must be a valid date');
  const receiptNo = `SG-DON-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const donation = await Donation.create({ eventId, donorName: data.donorName, amount, donatedAt, mode: data.mode || 'cash', note: data.note, receiptNo, enteredBy: actor._id });
  await audit(actor._id, 'donations.create', 'donation', donation._id, { eventId, receiptNo, amount }, req);
  return donation;
}

async function voidEventDonation(id, reason, actor, req) {
  if (!reason || !String(reason).trim()) throw new ApiError(400, 'A void reason is required');
  const donation = await Donation.findOneAndUpdate({ _id: id, status: 'posted' }, { $set: { status: 'void', voidReason: String(reason).trim() } }, { new: true, runValidators: true });
  if (!donation) throw new ApiError(404, 'Posted donation not found');
  await audit(actor._id, 'donations.void', 'donation', donation._id, { reason: String(reason).trim() }, req);
  return donation;
}

module.exports = { listEventDonations, createEventDonation, voidEventDonation };
