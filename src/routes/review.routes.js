const express = require('express');
const router = express.Router();

const { createReview, getReviewsForUser, getReviewsForDeal, getMyReviews } = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, createReview);
router.get('/my-reviews', protect, getMyReviews);
router.get('/user/:userId', getReviewsForUser);
router.get('/deal/:dealId', protect, getReviewsForDeal);

module.exports = router;
