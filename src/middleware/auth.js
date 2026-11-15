const Admin = require('../models/Admin');
const Role = require('../models/Role');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/token');

async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new ApiError(401, 'Authentication required');
    const payload = verifyToken(header.slice(7));
    const admin = await Admin.findById(payload.sub).select('+passwordHash').populate('roleId');
    if (!admin || admin.status !== 'active' || admin.tokenVersion !== payload.ver) throw new ApiError(401, 'Session is no longer valid');
    req.admin = admin;
    req.permissions = admin.roleId?.permissions || [];
    next();
  } catch (error) { next(error); }
}
function authorize(permission) {
  return (req, res, next) => {
    const permissions = req.permissions || [];
    if (permissions.includes('*') || permissions.includes(permission)) return next();
    next(new ApiError(403, `Missing permission: ${permission}`));
  };
}
module.exports = { authenticate, authorize };
