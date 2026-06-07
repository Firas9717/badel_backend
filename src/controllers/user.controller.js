const User = require('../models/User');
const Offer = require('../models/Offer');
const { uploadImage, deleteImage } = require('../utils/fileUpload');

async function getMyProfile(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({ path: 'favorites', select: 'title photos status estimatedValue category' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function updateProfile(req, res) {
  try {
    const body = req.body || {};
    
    // Parse location if it comes as a string from FormData
    if (typeof body.location === 'string') {
      try { body.location = JSON.parse(body.location); } catch (e) {}
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update allowed fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'location'];
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        // Handle nested location object
        if (f === 'location' && typeof body[f] === 'object') {
            const existing = user.location ? (user.location.toObject ? user.location.toObject() : user.location) : {};
            user.location = {
              governorate: body[f].governorate || existing.governorate,
              city: body[f].city || existing.city,
              coordinates: existing.coordinates || { type: 'Point', coordinates: [0, 0] }
            };
        } else {
            user[f] = body[f];
        }
      }
    }

    // Check if phone or email is being changed and if they already exist
    if (body.phone && body.phone !== user.phone) {
      const existingPhone = await User.findOne({ phone: body.phone, _id: { $ne: user._id } });
      if (existingPhone) return res.status(400).json({ success: false, message: 'Phone number already in use' });
    }

    if (req.file) {
      if (user.cloudinaryId) {
        await deleteImage(user.cloudinaryId, 'profiles', user.cloudinaryId.includes('.') ? 'local' : 'cloudinary');
      }
      const result = await uploadImage(req.file, 'profiles');
      if (result) {
        user.profilePhoto = result.secure_url;
        user.cloudinaryId = result.public_id;
      }
    }

    // Calculate trust score and badges before saving
    await user.calculateTrustScore();
    await user.updateBadges();

    const updated = await user.save();
    
    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getUserProfile(req, res) {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName profilePhoto bio location trustScore badges averageRating totalReviews totalExchanges successfulExchanges createdAt isActive');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const offers = await Offer.find({ user: req.params.id, status: 'active' }).select('title photos category estimatedValue offerType createdAt');
    return res.status(200).json({ success: true, user, offers, offerCount: offers.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function updateLocation(req, res) {
  try {
    const { governorate, city, coordinates, latitude, longitude } = req.body || {};
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.location = user.location || {};
    if (governorate) user.location.governorate = governorate;
    if (city) user.location.city = city;
    if (Array.isArray(coordinates)) {
      user.location.coordinates = { type: 'Point', coordinates };
    } else if (coordinates && coordinates.type === 'Point' && Array.isArray(coordinates.coordinates)) {
      user.location.coordinates = coordinates;
    } else if (latitude != null && longitude != null) {
      user.location.coordinates = { type: 'Point', coordinates: [Number(longitude), Number(latitude)] };
    }
    await user.save();
    return res.status(200).json({ success: true, message: 'Location updated', location: user.location });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function getFavorites(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({ path: 'favorites', populate: { path: 'user', select: 'firstName lastName profilePhoto' } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const favs = (user.favorites || []).filter(f => f.status === 'active');
    return res.status(200).json({ success: true, count: favs.length, favorites: favs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

async function deleteAccount(req, res) {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ success: false, message: 'Please provide your password to confirm account deletion' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Password is incorrect' });
    // Mark offers deleted
    await Offer.updateMany({ user: user._id }, { status: 'deleted' });
    if (user.cloudinaryId) {
      try { 
        // Detect if id is a path (local) or id (cloudinary)
        const storageType = user.cloudinaryId.includes('.') ? 'local' : 'cloudinary';
        await deleteImage(user.cloudinaryId, 'profiles', storageType);
      } catch (e) {}
    }
    user.isActive = false;
    user.email = `deleted_${user._id}@deleted.com`;
    user.phone = `deleted_${user._id}`;
    await user.save();
    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

module.exports = { getMyProfile, updateProfile, getUserProfile, updateLocation, getFavorites, deleteAccount };
