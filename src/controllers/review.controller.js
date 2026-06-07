const Review = require('../models/Review');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Notification = require('../models/Notification');

async function createReview(req, res) {
  try {
    const { dealId, rating, comment, itemAsDescribed, wouldTradeAgain } = req.body || {};
    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    if (!['accepted', 'meeting_scheduled', 'completed'].includes(deal.status)) return res.status(400).json({ success: false, message: 'Can only review accepted or completed deals' });
    if (![deal.offerer.toString(), deal.receiver.toString()].includes(req.user._id.toString())) return res.status(403).json({ success: false, message: 'Not authorized' });
    const reviewee = req.user._id.toString() === deal.offerer.toString() ? deal.receiver : deal.offerer;
    const exists = await Review.findOne({ deal: dealId, reviewer: req.user._id });
    if (exists) return res.status(400).json({ success: false, message: 'You have already reviewed this deal' });
    const review = await Review.create({ deal: dealId, reviewer: req.user._id, reviewee, rating, comment, itemAsDescribed, wouldTradeAgain });

    // Recalculate stats
    const all = await Review.find({ reviewee });
    const avg = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
    await User.findByIdAndUpdate(reviewee, { averageRating: Math.round(avg * 10) / 10, totalReviews: all.length });
    const user = await User.findById(reviewee);
    if (user) { await user.calculateTrustScore(); await user.updateBadges(); await user.save(); }
    await Notification.create({ user: reviewee, type: 'new_review', title: 'New Review', message: `You received a ${rating}-star review`, relatedDeal: dealId, relatedUser: req.user._id });
    return res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this deal' });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getReviewsForUser(req, res) {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId }).sort({ createdAt: -1 }).populate('reviewer', 'firstName lastName profilePhoto').populate('deal');
    const averageRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
    return res.status(200).json({ success: true, count: reviews.length, averageRating: Math.round(averageRating * 10) / 10, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getReviewsForDeal(req, res) {
  try {
    const reviews = await Review.find({ deal: req.params.dealId }).populate('reviewer reviewee');
    return res.status(200).json({ success: true, reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMyReviews(req, res) {
  try {
    const reviews = await Review.find({ reviewee: req.user._id })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'firstName lastName profilePhoto')
      .populate('deal');
    
    return res.status(200).json({ 
      success: true, 
      count: reviews.length, 
      reviews 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { createReview, getReviewsForUser, getReviewsForDeal, getMyReviews };
