const Member = require('../models/Member');
const ApiError = require('../utils/ApiError');
const service = require('../services/memberService');
const payments = require('../services/paymentService');
const { paged } = require('../utils/pagination');
async function list(req, res) { res.json({ success: true, data: await service.listMembers(req.query) }); }
async function create(req, res) { res.status(201).json({ success: true, data: await service.createMember(req.body, req.admin, req) }); }
async function batch(req, res) { const result = await service.batchCreate(req.body.members, req.admin, req); res.status(result.failed.length ? 207 : 201).json({ success: !result.failed.length, data: result }); }
async function get(req, res) { const member = await Member.findById(req.params.id); if (!member) throw new ApiError(404, 'Member not found'); res.json({ success: true, data: member }); }
async function update(req, res) { res.json({ success: true, data: await service.updateMember(req.params.id, req.body, req.admin, req) }); }
async function deactivate(req, res) { res.json({ success: true, data: await service.updateMember(req.params.id, { status: 'inactive', stopDueMonth: req.body.stopDueMonth }, req.admin, req) }); }
async function calendar(req, res) { res.json({ success: true, data: await payments.calendar(req.params.id, req.query.year) }); }
async function dues(req, res) { const filter = { memberId: req.params.id }; const result = await paged(require('../models/MonthlyDue'), filter, req.query, { sort: { dueMonth: -1 } }); res.json({ success: true, data: result }); }
async function generateDues(req, res) { res.json({ success: true, data: await service.generateDues(req.body.month, req.admin, req) }); }
module.exports = { list, create, batch, get, update, deactivate, calendar, dues, generateDues };
