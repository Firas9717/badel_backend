const mongoose = require('mongoose');
const Review = new mongoose.Schema({
  deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  itemAsDescribed: { type: Boolean },
  wouldTradeAgain: { type: Boolean }
}, { timestamps: true });

// Unique one review per deal per reviewer
Review.index({ deal: 1, reviewer: 1 }, { unique: true });
Review.index({ reviewee: 1 });

// After save, recalculate reviewee stats
Review.post('save', async function(doc) {
  try {
    const ReviewModel = mongoose.model('Review');
    const stats = await ReviewModel.aggregate([
      { $match: { reviewee: doc.reviewee } },
      { $group: { _id: '$reviewee', avgRating: { $avg: '$rating' }, total: { $sum: 1 } } }
    ]);
    const User = mongoose.model('User');
    if (stats && stats.length) {
      await User.findByIdAndUpdate(doc.reviewee, { averageRating: stats[0].avgRating || 0, totalReviews: stats[0].total || 0 });
    } else {
      await User.findByIdAndUpdate(doc.reviewee, { averageRating: 0, totalReviews: 0 });
    }
  } catch (err) {
    console.error('Failed to update user review stats:', err.message || err);
  }
});

module.exports = mongoose.model('Review', Review);
