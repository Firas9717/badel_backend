const AuditLog = require('../models/AuditLog');

/**
 * Log a sensitive action to the database
 * @param {string} userId - ID of the user performing the action
 * @param {string} action - Action name (e.g., 'DELETE_OFFER')
 * @param {Object} options - { targetId, targetModel, details, req }
 */
async function logAction(userId, action, options = {}) {
  try {
    const { targetId, targetModel, details, req } = options;
    
    await AuditLog.create({
      user: userId,
      action,
      targetId,
      targetModel,
      details,
      ip: req ? req.ip : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined
    });
  } catch (err) {
    // We don't want to crash the main request if logging fails
    console.error('Failed to create audit log:', err.message);
  }
}

module.exports = { logAction };
