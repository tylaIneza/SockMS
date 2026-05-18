const { run } = require('../config/db');
const { v4: uuid } = require('uuid');

async function audit(user, action, entityType, entityId = null, details = {}) {
  try {
    await run(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?,?)',
      [uuid(), user.id, user.name, action, entityType, entityId, JSON.stringify(details)],
    );
  } catch (_) { /* never block the main request */ }
}

module.exports = { audit };
