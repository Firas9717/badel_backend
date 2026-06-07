const Offer = require('../models/Offer');
const User = require('../models/User');

async function searchOffers(req, res) {
  try {
    const {
      q, category, offerType, seekingType, governorate, city,
      minValue, maxValue, condition, hasMoneyComplement, sortBy = 'newest', page = 1, limit = 20
    } = req.query;

    const filter = { status: 'active', expiresAt: { $gt: new Date() } };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (offerType) filter.offerType = offerType;
    if (seekingType) filter.seekingType = seekingType;
    if (governorate) {
      let govRegex = governorate;
      if (governorate.toLowerCase() === 'sousse') govRegex = 'sousse|soussa';
      else if (governorate.toLowerCase() === 'bizerte') govRegex = 'bizerte|bizert|benzaret';
      else if (governorate.toLowerCase() === 'nabeul') govRegex = 'nabeul|nabel';

      filter['$and'] = filter['$and'] || [];
      filter['$and'].push({
        $or: [
          { 'location.governorate': { $regex: govRegex, $options: 'i' } },
          { 'location.city': { $regex: govRegex, $options: 'i' } }
        ]
      });
    }
    if (city) {
      filter['$and'] = filter['$and'] || [];
      filter['$and'].push({ 'location.city': { $regex: city, $options: 'i' } });
    }
    if (minValue || maxValue) {
      filter.estimatedValue = {};
      if (minValue) filter.estimatedValue.$gte = parseFloat(minValue);
      if (maxValue) filter.estimatedValue.$lte = parseFloat(maxValue);
    }
    if (condition) filter.condition = condition;
    if (hasMoneyComplement === 'true') filter['moneyComplement.willing'] = true;

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

async function searchNearby(req, res) {
  try {
    const longitude = req.query.longitude || req.query.lng;
    const latitude = req.query.latitude || req.query.lat;
    const distanceParam = req.query.maxDistance || req.query.distance || 50;

    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: 'Please provide longitude and latitude' });
    }
    const meters = parseFloat(distanceParam) * 1000;
    const filter = {
      status: 'active',
      expiresAt: { $gt: new Date() },
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: meters
        }
      }
    };
    const offers = await Offer.find(filter).limit(50).populate('user', 'firstName lastName profilePhoto trustScore badges location');
    return res.status(200).json({ success: true, count: offers.length, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getCategoriesWithCount(req, res) {
  try {
    const categories = await Offer.aggregate([
      { $match: { status: 'active', expiresAt: { $gt: new Date() } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, category: '$_id', count: 1 } }
    ]);
    return res.status(200).json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getAutocompleteSuggestions(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(200).json({ success: true, suggestions: [] });
    const results = await Offer.find({ title: { $regex: q, $options: 'i' }, status: 'active' }).select('title category').limit(10);
    const titles = Array.from(new Set(results.map(r => r.title))).slice(0, 10);
    return res.status(200).json({ success: true, suggestions: titles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

/**
 * @desc    Global live search — searches Offers + Users in parallel
 * @route   GET /api/search/global?q=keyword
 * @access  Public
 */
async function globalSearch(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, offers: [], users: [] });
    }

    const query = q.trim();
    const regex = new RegExp(query, 'i');

    // Run both searches in parallel for speed
    const [offers, users] = await Promise.all([
      // Search Offers by title, description, tags
      Offer.find({
        status: 'active',
        expiresAt: { $gt: new Date() },
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
          { tags: { $regex: regex } },
          { category: { $regex: regex } }
        ]
      })
        .select('title category offerType photos location condition estimatedValue')
        .populate('user', 'firstName lastName profilePhoto')
        .sort({ isBoosted: -1, views: -1, createdAt: -1 })
        .limit(6)
        .lean(),

      // Search Users by firstName, lastName
      User.find({
        isActive: true,
        isBanned: false,
        $or: [
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } }
        ]
      })
        .select('firstName lastName profilePhoto location trustScore totalExchanges')
        .sort({ trustScore: -1 })
        .limit(4)
        .lean()
    ]);

    return res.status(200).json({ success: true, offers, users });
  } catch (err) {
    console.error('Global search error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { searchOffers, searchNearby, getCategoriesWithCount, getAutocompleteSuggestions, globalSearch };
