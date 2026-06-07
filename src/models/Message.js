const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: { type: String, enum: ['text','image','vocal','deal_proposal','deal_update','counter_offer','system'], default: 'text' },
  image: { url: String, cloudinaryId: String },
  audio: { url: String, cloudinaryId: String },
  dealProposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  dealMeta: {
    action:          { type: String },
    offererOffer:    { title: String, photo: String },
    receiverOffer:   { title: String, photo: String },
    moneyAmount:     { type: Number },
    counterMessage:  { type: String }
  },
  relatedOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Content required unless type is one of image/vocal/deal_proposal/system
messageSchema.pre('validate', function() {
  if (['image','vocal','deal_proposal','counter_offer','system'].includes(this.type)) return;
  if (!this.content || this.content.trim() === '') throw new Error('Content is required for text messages');
});

messageSchema.index({ conversation: 1, createdAt: 1 });

messageSchema.post('save', async function(doc) {
  try {
    const Conversation = mongoose.model('Conversation');
    await Conversation.findByIdAndUpdate(doc.conversation, {
      lastMessage: {
        content: doc.content,
        sender: doc.sender,
        createdAt: doc.createdAt || new Date()
      }
    });
  } catch (err) {
    // Log but don't throw
    console.error('Failed to update conversation lastMessage:', err.message || err);
  }
});

module.exports = mongoose.model('Message', messageSchema);
