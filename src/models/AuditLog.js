const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'DELETE_OFFER', 'COMPLETE_DEAL', 'UPDATE_USER_STATUS'
  targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the object affected
  targetModel: { type: String }, // e.g., 'Offer', 'Deal', 'User'
  details: { type: mongoose.Schema.Types.Mixed }, // Store the old/new values or extra info
  ip: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
