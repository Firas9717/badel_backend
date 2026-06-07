const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, enum: ['offer','user','message'] },
  targetOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  reason: { type: String, required: true, enum: ['fake','inappropriate','scam','harassment','spam','wrong_category','other'] },
  description: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['pending','reviewed','resolved','dismissed'], default: 'pending' },
  adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
