const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, enum: ['new_match','new_message','deal_proposed','deal_accepted','deal_completed','deal_cancelled','new_review','offer_favorited','system'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedConversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
