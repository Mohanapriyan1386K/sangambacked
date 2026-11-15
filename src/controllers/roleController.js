const Role = require('../models/Role');
const ApiError = require('../utils/ApiError');
const audit = require('../utils/audit');
const { paged } = require('../utils/pagination');
async function list(req, res) { res.json({ success: true, data: await paged(Role, {}, req.query) }); }
async function create(req, res) {
  const role = await Role.create({ name: req.body.name, permissions: [...new Set(req.body.permissions || [])] });
  await audit(req.admin._id, 'roles.create', 'role', role._id, {}, req);
  res.status(201).json({ success: true, data: role });
}
async function update(req, res) {
  const role = await Role.findById(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.isSystem && role.name === 'Admin') throw new ApiError(409, 'System Admin role cannot be edited');
  if (req.body.name !== undefined) role.name = req.body.name;
  if (req.body.permissions !== undefined) role.permissions = [...new Set(req.body.permissions)];
  await role.save();
  await audit(req.admin._id, 'roles.update', 'role', role._id, { fields: Object.keys(req.body) }, req);
  res.json({ success: true, data: role });
}
async function remove(req, res) {
  const role = await Role.findById(req.params.id);
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.isSystem) throw new ApiError(409, 'System roles cannot be deleted');
  const Admin = require('../models/Admin');
  if (await Admin.exists({ roleId: role._id })) throw new ApiError(409, 'Role is assigned to admin users');
  await role.deleteOne();
  await audit(req.admin._id, 'roles.delete', 'role', role._id, {}, req);
  res.json({ success: true, data: { message: 'Role deleted' } });
}
module.exports = { list, create, update, remove };
