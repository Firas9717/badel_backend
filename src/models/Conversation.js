const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    validate: {
      validator: function(v) { return Array.isArray(v) && v.length === 2; },
      message: 'Conversation must have exactly 2 participants'
    }
  },
  relatedOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  activeOffers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
  relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  lastMessage: {
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date }
  },
  isActive: { type: Boolean, default: true },
  type: { type: String, enum: ['deal', 'contact'], default: 'contact' }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
