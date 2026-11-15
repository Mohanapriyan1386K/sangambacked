const Admin = require('../models/Admin');
const Role = require('../models/Role');
const SangamSetting = require('../models/SangamSetting');
const { hashPassword } = require('../utils/password');

const adminPermissions = ['*'];
async function bootstrap() {
  let adminRole = await Role.findOne({ name: 'Admin' });
  if (!adminRole) adminRole = await Role.create({ name: 'Admin', permissions: adminPermissions, isSystem: true });
  await Role.updateOne({ name: 'Sub Admin' }, { $setOnInsert: { name: 'Sub Admin', permissions: [], isSystem: true } }, { upsert: true });
  if (!await Admin.exists({})) {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) throw new Error('Set INITIAL_ADMIN_EMAIL and a 12+ character INITIAL_ADMIN_PASSWORD before first startup');
    await Admin.create({ name: process.env.INITIAL_ADMIN_NAME || 'Sangam Administrator', email, passwordHash: await hashPassword(password), roleId: adminRole._id });
    console.log(`Initial admin created: ${email}`);
  }
  await SangamSetting.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main', monthlyFee: Number(process.env.DEFAULT_MONTHLY_FEE) || 100, timezone: 'Asia/Kolkata' } }, { upsert: true });
}
module.exports = bootstrap;
