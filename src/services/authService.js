const Admin = require('../models/Admin');
const { verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');

async function login({ email, password }, req) {
  const admin = await Admin.findOne({ email: String(email || '').toLowerCase().trim() }).select('+passwordHash').populate('roleId');
  if (!admin || admin.status !== 'active' || !await verifyPassword(password || '', admin.passwordHash)) {
    throw new ApiError(401, 'Email or password is incorrect');
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  await audit(admin._id, 'auth.login', 'admin', admin._id, {}, req);
  return { token: signToken(admin._id, admin.tokenVersion), admin: publicAdmin(admin) };
}
function publicAdmin(admin) {
  return { id: admin._id, name: admin.name, email: admin.email, phone: admin.phone, status: admin.status,
    lastLoginAt: admin.lastLoginAt, role: admin.roleId && { id: admin.roleId._id, name: admin.roleId.name, permissions: admin.roleId.permissions } };
}
module.exports = { login, publicAdmin };
