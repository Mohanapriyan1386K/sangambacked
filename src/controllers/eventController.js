const Event = require('../models/Event');
const Organizer = require('../models/Organizer');
const EventExpense = require('../models/EventExpense');
const service = require('../services/eventService');
const ApiError = require('../utils/ApiError');
const { paged } = require('../utils/pagination');
const audit = require('../utils/audit');
const donationService = require('../services/donationService');
async function list(req, res) { res.json({ success: true, data: await service.listEvents(req.query) }); }
async function create(req, res) { res.status(201).json({ success: true, data: await service.createEvent(req.body, req.admin, req) }); }
async function get(req, res) { const event = await Event.findById(req.params.id).populate('organizerIds').lean(); if (!event) throw new ApiError(404, 'Event not found'); res.json({ success: true, data: event }); }
async function update(req, res) { res.json({ success: true, data: await service.updateEvent(req.params.id, req.body, req.admin, req) }); }
async function remove(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  event.status = 'cancelled'; await event.save();
  await audit(req.admin._id, 'events.cancel', 'event', event._id, {}, req);
  res.json({ success: true, data: event });
}
async function organizers(req, res) { res.json({ success: true, data: await service.listOrganizers(req.query) }); }
async function createOrganizer(req, res) { res.status(201).json({ success: true, data: await service.createOrganizer(req.body, req.admin, req) }); }
async function updateOrganizer(req, res) {
  const update = { ...req.body };
  if (update.isPublic === true && update.publicConsent !== true) throw new (require('../utils/ApiError'))(400, 'publicConsent must be confirmed before publishing organizer details or photos');
  if (update.publicConsent === true) update.publicConsentAt = new Date();
  delete update.publicConsent;
  const item = await Organizer.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Organizer not found');
  await audit(req.admin._id, 'organizers.update', 'organizer', item._id, { fields: Object.keys(update) }, req);
  res.json({ success: true, data: item });
}
async function expenses(req, res) { const result = await paged(EventExpense, { eventId: req.params.id }, req.query, { sort: { spentAt: -1 } }); res.json({ success: true, data: result }); }
async function createExpense(req, res) { res.status(201).json({ success: true, data: await service.addExpense(req.params.id, req.body, req.admin, req) }); }
async function voidExpense(req, res) { res.json({ success: true, data: await service.voidExpense(req.params.id, req.body.reason, req.admin, req) }); }
async function donations(req, res) { res.json({ success: true, data: await donationService.listEventDonations(req.params.id, req.query) }); }
async function createDonation(req, res) { res.status(201).json({ success: true, data: await donationService.createEventDonation(req.params.id, req.body, req.admin, req) }); }
async function voidDonation(req, res) { res.json({ success: true, data: await donationService.voidEventDonation(req.params.id, req.body.reason, req.admin, req) }); }
async function publicEvents(req, res) { res.json({ success: true, data: await service.publicEvents(req.query) }); }
async function publicEventArchive(req, res) { res.json({ success: true, data: await service.publicEventArchive(req.query) }); }
async function publicEvent(req, res) { res.json({ success: true, data: await service.publicEvent(req.params.slug) }); }
module.exports = { list, create, get, update, remove, organizers, createOrganizer, updateOrganizer, expenses, createExpense, voidExpense, donations, createDonation, voidDonation, publicEvents, publicEventArchive, publicEvent };
