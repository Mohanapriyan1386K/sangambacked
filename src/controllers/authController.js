const Admin = require('../models/Admin');
const Role = require('../models/Role');
const authService = require('../services/authService');
const audit = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');
const { paged } = require('../utils/pagination');

async function login(req, res) { res.json({ success: true, data: await authService.login(req.body, req) }); }
async function me(req, res) { res.json({ success: true, data: authService.publicAdmin(req.admin) }); }
async function logout(req, res) {
  await Admin.updateOne({ _id: req.admin._id }, { $inc: { tokenVersion: 1 } });
  await audit(req.admin._id, 'auth.logout', 'admin', req.admin._id, {}, req);
  res.json({ success: true, data: { message: 'Logged out' } });
}
async function listUsers(req, res) {
  const result = await paged(Admin, {}, req.query, { select: '-passwordHash -tokenVersion', sort: { createdAt: -1 } });
  for (const admin of result.items) admin.role = await Role.findById(admin.roleId).select('name permissions').lean();
  res.json({ success: true, data: result });
}
async function createUser(req, res) {
  const { name, email, password, roleId, phone } = req.body;
  if (String(password || '').length < 12) throw new ApiError(400, 'Initial password must contain at least 12 characters');
  if (!await Role.exists({ _id: roleId })) throw new ApiError(400, 'Valid roleId is required');
  const admin = await Admin.create({ name, email, phone, roleId, passwordHash: await hashPassword(password) });
  await audit(req.admin._id, 'users.create', 'admin', admin._id, { email: admin.email }, req);
  res.status(201).json({ success: true, data: { id: admin._id, name: admin.name, email: admin.email, status: admin.status, roleId: admin.roleId } });
}
async function setUserStatus(req, res) {
  const status = req.body.status;
  if (!['active', 'inactive'].includes(status)) throw new ApiError(400, 'status must be active or inactive');
  if (String(req.admin._id) === req.params.id && status === 'inactive') throw new ApiError(409, 'You cannot deactivate your own account');
  const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { status }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true }).select('-passwordHash');
  if (!admin) throw new ApiError(404, 'Admin user not found');
  await audit(req.admin._id, 'users.status', 'admin', admin._id, { status }, req);
  res.json({ success: true, data: admin });
}
async function resetPassword(req, res) {
  if (String(req.body.password || '').length < 12) throw new ApiError(400, 'Password must contain at least 12 characters');
  const admin = await Admin.findByIdAndUpdate(req.params.id, { $set: { passwordHash: await hashPassword(req.body.password) }, $inc: { tokenVersion: 1 } }, { new: true });
  if (!admin) throw new ApiError(404, 'Admin user not found');
  await audit(req.admin._id, 'users.password_reset', 'admin', admin._id, {}, req);
  res.json({ success: true, data: { message: 'Password updated; existing sessions revoked' } });
}
module.exports = { login, me, logout, listUsers, createUser, setUserStatus, resetPassword };
