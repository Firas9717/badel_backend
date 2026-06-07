const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[2345679]\d{7}$/;

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return emailRegex.test(v);
        },
        message: 'Invalid email format',
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return phoneRegex.test(v);
        },
        message: 'Invalid Tunisian phone number',
      },
    },
    password: { type: String, minlength: 6, maxlength: 128, select: false },
    googleId: { type: String, unique: true, sparse: true },
    authMethod: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profilePhoto: { type: String, default: 'default-avatar.png' },
    cloudinaryId: { type: String },
    bio: { type: String, maxlength: 500 },
    location: {
      governorate: {
        type: String,
        enum: [
          'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Beja', 'Jendouba', 'Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabes', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili'
        ],
      },
      city: { type: String },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    trustScore: { type: Number, default: 10, min: 0, max: 100 },
    badges: {
      type: [String],
      enum: ['new', 'verified', 'trusted', 'super_exchanger', 'ambassador', 'founder'],
      default: ['new'],
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isCINVerified: { type: Boolean, default: false },
    totalExchanges: { type: Number, default: 0 },
    successfulExchanges: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
    interests: {
      categories: [{ type: String }],
      onboardingCompleted: { type: Boolean, default: false },
      updatedAt: { type: Date }
    },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpire: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ firstName: 'text', lastName: 'text' });

// Virtuals
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware: location normalization and password hashing
userSchema.pre('save', async function () {
  try {
    // Normalize GeoJSON coordinates
    if (this.location) {
      const coords = this.location.coordinates;
      if (coords == null) {
        this.location.coordinates = { type: 'Point', coordinates: [0, 0] };
      } else if (Array.isArray(coords)) {
        this.location.coordinates = { type: 'Point', coordinates: coords };
      } else if (coords.type === 'Point' && Array.isArray(coords.coordinates)) {
        this.location.coordinates.type = 'Point';
      } else if (Array.isArray(coords.coordinates)) {
        this.location.coordinates = { type: 'Point', coordinates: coords.coordinates };
      } else {
        this.location.coordinates = { type: 'Point', coordinates: [0, 0] };
      }
    }

    // Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  } catch (err) {
    throw err;
  }
});

// Methods
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  const payload = { id: this._id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
  return token;
};

userSchema.methods.calculateTrustScore = async function () {
  let score = 0;
  if (this.isEmailVerified) score += 10;
  if (this.isPhoneVerified) score += 15;
  if (this.isCINVerified) score += 20;
  if (this.profilePhoto && this.profilePhoto !== 'default-avatar.png') score += 5;
  if (this.bio && this.bio.trim().length > 0) score += 5;

  if (this.successfulExchanges && this.successfulExchanges > 0) {
    const extra = Math.min((this.successfulExchanges - 1) * 3, 30);
    score += 10 + extra;
  }

  const estimatedPositive = Math.round((this.averageRating / 5) * this.totalReviews);
  const cappedPositive = Math.min(estimatedPositive, 10);
  score += cappedPositive * 2;

  if (score > 100) score = 100;
  this.trustScore = score;
  return score;
};

userSchema.methods.updateBadges = async function () {
  const score = this.trustScore;
  let badge = 'new';
  if (score <= 20) badge = 'new';
  else if (score <= 40) badge = 'verified';
  else if (score <= 60) badge = 'trusted';
  else if (score <= 80) badge = 'super_exchanger';
  else badge = 'ambassador';

  this.badges = [badge];
  return this.badges;
};

userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

module.exports = mongoose.model('User', userSchema);
