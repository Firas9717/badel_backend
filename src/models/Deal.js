const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  offerer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offererOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  receiverOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
  moneyComplement: {
    amount: { type: Number, default: 0 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    method: { type: String, enum: ['cash', 'flouci', 'd17', 'bank_transfer'] },
    status: { type: String, enum: ['pending', 'paid', 'confirmed'], default: 'pending' },
  },
  status: { type: String, enum: ['proposed','counter_offered','accepted','meeting_scheduled','completed','cancelled','disputed','expired'], default: 'proposed' },
  counterOffer: {
    message: { type: String },
    newMoneyAmount: { type: Number },
    createdAt: { type: Date }
  },
  meetingDetails: {
    location: {
      address: { type: String },
      coordinates: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
      }
    },
    scheduledDate: { type: Date },
    notes: { type: String }
  },
  offererConfirmed: { type: Boolean, default: false },
  receiverConfirmed: { type: Boolean, default: false },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String },
  message: { type: String, default: '' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  lastActionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
}, { timestamps: true });

// Default expiresAt to 7 days from now if not set
dealSchema.pre('save', function() {
  if (!this.expiresAt) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    this.expiresAt = d;
  }
});

// Indexes
dealSchema.index({ offerer: 1, receiver: 1, status: 1 });
dealSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Deal', dealSchema);
