const Offer = require('../models/Offer');
const User = require('../models/User');
const { uploadImage, deleteImage } = require('../utils/fileUpload');
const { logAction } = require('../utils/audit');
const { resolveOfferCategories, DEFAULT_POPULAR_CATEGORIES } = require('../config/categories.config');


// Helper to parse strings that could be comma-separated or JSON arrays
function parseStringArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [];
  
  const trimmed = val.trim();
  // If it's a JSON array string
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  
  // Fallback: split by comma
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

async function createOffer(req, res) {
  try {
    console.log('DEBUG: req.body received:', req.body);
    const {
      title, description, offerType, category, subcategory, condition,
      estimatedValue, seekingType, seekingDescription,
      governorate, city, tags: rawTags, seekingCategories: rawSC, moneyComplement
    } = req.body || {};
 
    // Reconstruct location object for the model
    const location = {
      governorate: governorate || 'Tunis',
      city: city || governorate || 'Tunis'
    };
    
    // Ensure arrays are correctly parsed (handles comma-separated strings)
    const tags = parseStringArray(rawTags);
    const seekingCategories = parseStringArray(rawSC);

    // Prepare location data (handle nested latitude/longitude)
    if (location && typeof location === 'object') {
      const { latitude, longitude, ...rest } = location;
      if (latitude && longitude) {
        location.coordinates = {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
      }
    }

    const photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadImage(file, 'offers');
        if (result) {
          photos.push({ url: result.secure_url, cloudinaryId: result.public_id });
        }
      }
    }

    // BYPASS DEV : photos non obligatoires pour les tests
    // if ((!photos || photos.length === 0) && offerType === 'bien') {
    //   return res.status(400).json({ success: false, message: 'At least one photo is required for items' });
    // }

    if (moneyComplement && typeof moneyComplement === 'object' && moneyComplement.amount < 0) {
      return res.status(400).json({ success: false, message: 'Money amount must be positive' });
    }

    const offerData = {
      user: req.user._id,
      title, description, offerType, category, subcategory, condition,
      estimatedValue, seekingType, seekingDescription, seekingCategories,
      moneyComplement, location, tags,
      photos
    };

    const offer = await Offer.create(offerData);
    await offer.populate('user', 'firstName lastName profilePhoto trustScore badges');
    return res.status(201).json({ success: true, offer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getAllOffers(req, res) {
  try {
    const {
      category, offerType, seekingType, governorate, minValue, maxValue, condition,
      page = 1, limit = 20, sortBy = 'newest'
    } = req.query;

    const filter = { status: 'active', expiresAt: { $gt: new Date() } };
    if (category && typeof category === 'string') filter.category = category;
    if (offerType && typeof offerType === 'string') filter.offerType = offerType;
    if (seekingType && typeof seekingType === 'string') filter.seekingType = seekingType;
    if (governorate && typeof governorate === 'string') filter['location.governorate'] = governorate;
    if (condition && typeof condition === 'string') filter.condition = condition;
    if (minValue || maxValue) {
      filter.estimatedValue = {};
      if (minValue) filter.estimatedValue.$gte = parseFloat(minValue);
      if (maxValue) filter.estimatedValue.$lte = parseFloat(maxValue);
    }

    let sort = { isBoosted: -1, createdAt: -1 };
    if (sortBy === 'oldest') sort = { createdAt: 1 };
    else if (sortBy === 'value_high') sort = { estimatedValue: -1 };
    else if (sortBy === 'value_low') sort = { estimatedValue: 1 };
    else if (sortBy === 'most_viewed') sort = { views: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const offers = await Offer.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).populate('user', 'firstName lastName profilePhoto trustScore badges location');
    const total = await Offer.countDocuments(filter);
    return res.status(200).json({ success: true, count: offers.length, total, page: parseInt(page), totalPages: Math.ceil(total / limit), offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getOfferById(req, res) {
  try {
    const offer = await Offer.findById(req.params.id).populate('user', 'firstName lastName profilePhoto trustScore badges');
    if (!offer || offer.status === 'deleted') return res.status(404).json({ success: false, message: 'Offer not found' });
    offer.views = (offer.views || 0) + 1;
    await offer.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, offer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function updateOffer(req, res) {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized to update this offer' });

    // Fields are already parsed by parseMultipartJson middleware
    const body = req.body || {};
    if (body.tags !== undefined) offer.tags = parseStringArray(body.tags);
    if (body.seekingCategories !== undefined) offer.seekingCategories = parseStringArray(body.seekingCategories);
    
    // Handle removed photos (already parsed by middleware if sent as JSON)
    const removedPhotos = body.removedPhotos;
    if (removedPhotos && Array.isArray(removedPhotos)) {
      for (const id of removedPhotos) {
        // Detect if id is a path (local) or id (cloudinary)
        const storageType = id.includes('.') ? 'local' : 'cloudinary';
        await deleteImage(id, 'offers', storageType);
        offer.photos = offer.photos.filter(p => p.cloudinaryId !== id);
      }
    }

    if (body.location && typeof body.location === 'object') {
      const { latitude, longitude } = body.location;
      if (latitude && longitude) {
        body.location.coordinates = {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        };
      }
    }
    
    // Upload new files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadImage(file, 'offers');
        if (result) {
          offer.photos.push({ url: result.secure_url, cloudinaryId: result.public_id });
        }
      }
    }

    // Update provided fields — skip empty strings (sent by Swagger for unfilled fields)
    const scalarFields = ['title','description','offerType','category','subcategory','condition','estimatedValue','seekingType','seekingDescription','status'];
    for (const field of scalarFields) {
      const val = body[field];
      // Only update if value is present and not an empty string
      if (val !== undefined && val !== '') offer[field] = val;
    }

    // Handle object fields separately (already parsed by middleware)
    if (body.location && typeof body.location === 'object') {
      offer.location = body.location;
    }
    if (body.moneyComplement && typeof body.moneyComplement === 'object') {
      if (body.moneyComplement.amount < 0) return res.status(400).json({ success: false, message: 'Money amount must be positive' });
      offer.moneyComplement = body.moneyComplement;
    }

    await offer.save();
    await offer.populate('user', 'firstName lastName profilePhoto trustScore badges');
    return res.status(200).json({ success: true, offer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function deleteOffer(req, res) {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (offer.photos && offer.photos.length) {
      for (const p of offer.photos) {
        const storageType = (p.cloudinaryId && p.cloudinaryId.includes('.')) ? 'local' : 'cloudinary';
        await deleteImage(p.cloudinaryId, 'offers', storageType);
      }
    }
    offer.status = 'deleted';
    await offer.save();

    // Log the sensitive action
    await logAction(req.user._id, 'DELETE_OFFER', { 
      targetId: offer._id, 
      targetModel: 'Offer',
      req 
    });

    return res.status(200).json({ success: true, message: 'Offer deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getMyOffers(req, res) {
  try {
    const offers = await Offer.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: offers.length, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getOffersByUser(req, res) {
  try {
    const offers = await Offer.find({ user: req.params.userId, status: 'active', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).populate('user', 'firstName lastName profilePhoto trustScore badges');
    return res.status(200).json({ success: true, count: offers.length, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function toggleFavorite(req, res) {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    const user = await User.findById(req.user._id);
    const idx = user.favorites.findIndex(f => f.toString() === offer._id.toString());
    let isFavorited = false;
    if (idx > -1) {
      user.favorites.splice(idx, 1);
      offer.favorites = Math.max(0, (offer.favorites || 0) - 1);
      isFavorited = false;
    } else {
      user.favorites.push(offer._id);
      offer.favorites = (offer.favorites || 0) + 1;
      isFavorited = true;
    }
    await user.save();
    await offer.save();
    return res.status(200).json({ success: true, isFavorited, message: isFavorited ? 'Added to favorites' : 'Removed from favorites' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function boostOffer(req, res) {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    if (offer.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    offer.isBoosted = true;
    offer.boostExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await offer.save();

    // Log the action
    await logAction(req.user._id, 'BOOST_OFFER', { 
      targetId: offer._id, 
      targetModel: 'Offer',
      req 
    });

    return res.status(200).json({ success: true, offer, message: 'Offer boosted for 24 hours' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getPersonalizedOffers(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Retrieve user and their interests
    const user = await User.findById(req.user._id);
    let interestSlugs = [];

    if (user && user.interests && user.interests.categories && user.interests.categories.length > 0) {
      interestSlugs = user.interests.categories;
    } else {
      // Fallback to default popular categories
      interestSlugs = DEFAULT_POPULAR_CATEGORIES;
    }

    // Resolve onboarding slugs to technical Offer categories
    const resolvedOfferCategories = resolveOfferCategories(interestSlugs);

    // Base query for active, non-expired offers
    const matchQuery = {
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    // Use aggregation to sort:
    // 1. Boosted status (isBoosted: true first)
    // 2. Matching user's categories (in resolved categories first)
    // 3. Recency (createdAt: -1)
    const offers = await Offer.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          isPreferred: {
            $cond: {
              if: { $in: ['$category', resolvedOfferCategories] },
              then: 1,
              else: 0
            }
          }
        }
      },
      {
        $sort: {
          isBoosted: -1,
          isPreferred: -1,
          createdAt: -1
        }
      },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Populate user details for each offer since aggregate doesn't do it automatically
    const populatedOffers = await Offer.populate(offers, {
      path: 'user',
      select: 'firstName lastName profilePhoto trustScore badges location'
    });

    const total = await Offer.countDocuments(matchQuery);

    return res.status(200).json({
      success: true,
      count: populatedOffers.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      offers: populatedOffers
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
}

module.exports = { createOffer, getAllOffers, getOfferById, updateOffer, deleteOffer, getMyOffers, getOffersByUser, toggleFavorite, boostOffer, getPersonalizedOffers };
