const AuditLog = require('../models/AuditLog');

async function audit(actorId, action, entity, entityId, metadata = {}, req) {
  try {
    await AuditLog.create({ actorId, action, entity, entityId: entityId ? String(entityId) : undefined,
      metadata, ip: req?.ip, userAgent: req?.get('user-agent') });
  } catch (error) { console.error('Audit write failed:', error.message); }
}
module.exports = audit;
