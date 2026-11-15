const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const EventExpense = require('../models/EventExpense');
const ApiError = require('../utils/ApiError');
const { paged } = require('../utils/pagination');
const audit = require('../utils/audit');

function slugify(value) { return String(value).toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
async function uniqueSlug(value, excludeId) {
  const base = slugify(value);
  if (!base) throw new ApiError(400, 'Event title must include letters or numbers');
  let slug = base, n = 2;
  while (await Event.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${n++}`;
  return slug;
}
async function validateOrganizerIds(ids) {
  if (!Array.isArray(ids)) throw new ApiError(400, 'organizerIds must be an array');
  const uniqueIds = [...new Set(ids.map(String))];
  const activeCount = uniqueIds.length ? await Organizer.countDocuments({ _id: { $in: uniqueIds }, status: 'active' }) : 0;
  if (activeCount !== uniqueIds.length) throw new ApiError(400, 'One or more organizers are missing or inactive');
  return uniqueIds;
}
async function createEvent(data, actor, req) {
  if (new Date(data.endsAt) < new Date(data.startsAt)) throw new ApiError(400, 'endsAt must be on or after startsAt');
  data.organizerIds = await validateOrganizerIds(data.organizerIds || []);
  const event = await Event.create({ ...data, slug: data.slug ? await uniqueSlug(data.slug) : await uniqueSlug(data.title), publishedAt: data.status === 'published' ? new Date() : undefined });
  await audit(actor._id, 'events.create', 'event', event._id, { title: event.title }, req);
  return event;
}
async function updateEvent(id, data, actor, req) {
  const current = await Event.findById(id);
  if (!current) throw new ApiError(404, 'Event not found');
  if (new Date(data.endsAt || current.endsAt) < new Date(data.startsAt || current.startsAt)) throw new ApiError(400, 'endsAt must be on or after startsAt');
  if (data.organizerIds !== undefined) data.organizerIds = await validateOrganizerIds(data.organizerIds);
  if (data.title && !data.slug) data.slug = await uniqueSlug(data.title, id);
  if (data.slug) data.slug = await uniqueSlug(data.slug, id);
  if (data.status === 'published' && current.status !== 'published') data.publishedAt = new Date();
  if (data.status === 'draft') data.publishedAt = null;
  Object.assign(current, data);
  await current.save();
  await audit(actor._id, 'events.update', 'event', id, { fields: Object.keys(data) }, req);
  return current;
}
async function listEvents(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.title = { $regex: String(query.search).slice(0, 80), $options: 'i' };
  return paged(Event, filter, query, { sort: { startsAt: 1 }, select: '-__v' });
}
async function createOrganizer(data, actor, req) {
  if (data.isPublic && data.publicConsent !== true) throw new ApiError(400, 'publicConsent must be confirmed before publishing organizer details or photos');
  const consent = data.publicConsent === true;
  delete data.publicConsent;
  if (consent) data.publicConsentAt = new Date();
  const organizer = await Organizer.create(data);
  await audit(actor._id, 'organizers.create', 'organizer', organizer._id, {}, req);
  return organizer;
}
async function listOrganizers(query) { return paged(Organizer, query.status ? { status: query.status } : {}, query); }
async function addExpense(eventId, data, actor, req) {
  if (!await Event.exists({ _id: eventId })) throw new ApiError(404, 'Event not found');
  const expense = await EventExpense.create({ ...data, eventId, enteredBy: actor._id });
  await audit(actor._id, 'expenses.create', 'eventExpense', expense._id, { eventId, amount: expense.amount }, req);
  return expense;
}
async function voidExpense(id, reason, actor, req) {
  if (!reason || !String(reason).trim()) throw new ApiError(400, 'A void reason is required');
  const expense = await EventExpense.findOneAndUpdate({ _id: id, status: 'posted' }, { $set: { status: 'void', voidReason: String(reason).trim() } }, { new: true, runValidators: true });
  if (!expense) throw new ApiError(404, 'Posted expense not found');
  await audit(actor._id, 'expenses.void', 'eventExpense', id, { reason }, req);
  return expense;
}
async function publicEvents(query) {
  const now = new Date();
  const filter = { status: 'published', endsAt: { $gte: now } };
  const [items, total] = await Promise.all([
    Event.find(filter).sort({ startsAt: 1 }).skip((Math.max(1, Number(query.page) || 1) - 1) * Math.min(50, Number(query.limit) || 12)).limit(Math.min(50, Number(query.limit) || 12)).select('title slug description startsAt endsAt venue coverImage gallery organizerIds publishedAt').populate({ path: 'organizerIds', match: { status: 'active', isPublic: true, publicConsentAt: { $ne: null } }, select: 'name role photo isPublic' }).lean(),
    Event.countDocuments(filter),
  ]);
  const limit = Math.min(50, Number(query.limit) || 12), page = Math.max(1, Number(query.page) || 1);
  return { items: items.map((event) => ({ ...event, organizers: event.organizerIds, organizerIds: undefined })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
async function publicEventArchive(query) {
  const filter = { status: 'published', endsAt: { $lt: new Date() } };
  if (query.year) {
    if (!/^\d{4}$/.test(String(query.year))) throw new ApiError(400, 'year must have four digits');
    filter.startsAt = { $gte: new Date(`${query.year}-01-01T00:00:00.000Z`), $lt: new Date(`${Number(query.year) + 1}-01-01T00:00:00.000Z`) };
  }
  return paged(Event, filter, query, { sort: { startsAt: -1 }, select: 'title slug description startsAt endsAt venue coverImage gallery organizerIds publishedAt' });
}
async function publicEvent(slug) {
  const event = await Event.findOne({ slug, status: 'published' }).select('title slug description startsAt endsAt venue coverImage gallery organizerIds publishedAt').populate({ path: 'organizerIds', match: { status: 'active', isPublic: true, publicConsentAt: { $ne: null } }, select: 'name role photo isPublic' }).lean();
  if (!event) throw new ApiError(404, 'Published event not found');
  return { ...event, organizers: event.organizerIds, organizerIds: undefined };
}
module.exports = { createEvent, updateEvent, listEvents, createOrganizer, listOrganizers, addExpense, voidExpense, publicEvents, publicEventArchive, publicEvent };
