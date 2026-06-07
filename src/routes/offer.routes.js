const express = require('express');
const router = express.Router();
const { 
    createOffer, getAllOffers, getOfferById, updateOffer, deleteOffer, 
    getMyOffers, getOffersByUser, toggleFavorite, boostOffer, getPersonalizedOffers
} = require('../controllers/offer.controller');
const { protect, restrictedAccess } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validate');
const { createOfferSchema } = require('../validators/offer.validator');
const { createLimiter } = require('../middleware/rateLimiter');

// Configuration POST /
router.post('/', 
    protect, 
    createLimiter, 
    restrictedAccess, 
    upload.array('photos', 5), // Multer remplit req.body ici
    validate(createOfferSchema), // On valide après multer
    createOffer
);

router.get('/', getAllOffers);
router.get('/personalized', protect, getPersonalizedOffers);
router.get('/my/offers', protect, getMyOffers); // ✅ أضفنا هذا المسار
router.get('/:id', getOfferById);
router.get('/user/:userId', getOffersByUser);
router.put('/:id', protect, upload.array('photos', 5), updateOffer);
router.delete('/:id', protect, deleteOffer);

// ✅ Add missing feature endpoints (Favorites & Boosting)
router.post('/:id/favorite', protect, toggleFavorite);
router.post('/:id/boost', protect, boostOffer);

module.exports = router;
