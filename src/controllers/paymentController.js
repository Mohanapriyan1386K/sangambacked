const service = require('../services/paymentService');
const reportService = require('../services/reportService');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
async function list(req, res) { res.json({ success: true, data: await service.listPayments(req.query) }); }
async function create(req, res) { res.status(201).json({ success: true, data: await service.postPayment(req.body, req.admin, req) }); }
async function receipt(req, res) {
  const payment = await Payment.findById(req.params.id).populate('memberId', 'memberCode name phone').populate('dueId', 'dueMonth dueAmount adjustments').lean();
  if (!payment) throw new ApiError(404, 'Payment not found');
  res.json({ success: true, data: payment });
}
async function voidPayment(req, res) { res.json({ success: true, data: await service.voidPayment(req.params.id, req.body.reason, req.admin, req) }); }
async function dues(req, res) { res.json({ success: true, data: await reportService.listDues(req.query) }); }
async function report(req, res) { res.json({ success: true, data: await reportService.collectionReport(req.query.month) }); }
async function exportReport(req, res) {
  const { month, csv } = await reportService.exportCollections(req.query.month);
  res.type('text/csv').set('Content-Disposition', `attachment; filename="sangam-collections-${month}.csv"`).send(csv);
}
async function dashboard(req, res) { res.json({ success: true, data: await reportService.dashboard(req.query.month) }); }
module.exports = { list, create, receipt, voidPayment, dues, report, exportReport, dashboard };
