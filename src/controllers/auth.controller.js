const User = require('../models/User');
const crypto = require('crypto');
const { cookieOptions } = require('../config/auth');

// ── Helper pour envoyer le token via Cookie ──
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateAuthToken();

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    // On ne renvoie plus le token dans le JSON pour forcer l'usage du cookie
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      location: user.location,
      trustScore: user.trustScore,
      badges: user.badges,
      profilePhoto: user.profilePhoto,
      createdAt: user.createdAt,
      onboardingCompleted: user.interests ? user.interests.onboardingCompleted : false,
    }
  });
};

// ── Inscription ──
async function register(req, res) {
  try {
    const { firstName, lastName, email, phone, password, location } = req.body || {};
    if (email && typeof email !== 'string') return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (phone && typeof phone !== 'string') return res.status(400).json({ success: false, message: 'Invalid phone format' });
    
    const normalizedEmail = email && email.trim().toLowerCase();
    const normalizedPhone = phone && phone.trim();

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
    if (existingUser) {
      const isEmail = existingUser.email === normalizedEmail;
      const isPhone = existingUser.phone === normalizedPhone;
      let msg = isEmail && isPhone ? 'Email and phone number already registered' : (isEmail ? 'Email already registered' : 'Phone number already registered');
      return res.status(400).json({ success: false, message: msg });
    }
    
    if (password && password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password is too long (maximum 128 characters)' });
    }
    
    const user = await User.create({
      firstName: firstName && firstName.trim(),
      lastName: lastName && lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      location,
    });

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    // Envoyer le cookie directement après l'inscription
    const token = user.generateAuthToken();
    res.status(201).cookie('token', token, cookieOptions).json({
      success: true,
      verifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        onboardingCompleted: false
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Connexion ──
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });
    if (typeof email !== 'string') return res.status(400).json({ success: false, message: 'Invalid email format' });
    
    const normalizedEmail = email.trim().toLowerCase();
    console.log('[LOGIN DEBUG] Attempting login for:', normalizedEmail);
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      console.log('[LOGIN DEBUG] ❌ No user found with email:', normalizedEmail);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log('[LOGIN DEBUG] ✅ User found:', user.firstName, user.lastName);
    
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    
    const isMatch = await user.comparePassword(password);
    console.log('[LOGIN DEBUG] Password match:', isMatch);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    
    // تحديث سريع لآخر دخول بدون تعطيل العملية
    await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });
    
    sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Déconnexion ──
async function logout(req, res) {
  // Effacer le cookie en utilisant les mêmes options de sécurité
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return res.status(200).json({ success: true, message: 'Logged out successfully' });
}


// ── Récupérer mes infos ──
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({ path: 'favorites', select: 'title photos status' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Mot de passe oublié ──
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const response = { success: true, message: 'Password reset link generated' };
    if (process.env.NODE_ENV === 'development') {
      response.resetUrl = resetUrl;
      response.resetToken = resetToken;
    }
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Réinitialiser le mot de passe ──
async function resetPassword(req, res) {
  try {
    const token = req.params.token;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashed, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    
    const newPassword = (req.body || {}).password;
    if (newPassword && newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'Password is too long (maximum 128 characters)' });
    }
    
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Mettre à jour le mot de passe ──
async function updatePassword(req, res) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const body = req.body || {};
    const isMatch = await user.comparePassword(body.currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    
    if (body.newPassword && body.newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'Password is too long (maximum 128 characters)' });
    }
    
    user.password = body.newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Vérifier l'email ──
async function verifyEmail(req, res) {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ emailVerificationToken: hashed, emailVerificationExpire: { $gt: Date.now() } });
    
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    
    await user.calculateTrustScore();
    await user.updateBadges();
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
  }
}

// ── Google Auth Callback ──
async function googleAuthCallback(req, res) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:8080';
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${clientUrl}/login.html?error=auth_failed`);
    }

    if (user.isBanned) {
      return res.redirect(`${clientUrl}/login.html?error=${encodeURIComponent('Votre compte est banni. Raison : ' + (user.banReason || 'Non spécifiée'))}`);
    }

    const token = user.generateAuthToken();
    
    // Set cookie
    res.cookie('token', token, cookieOptions);
    
    // Redirect to a frontend page that will handle the user data
    // We can pass the user info in the URL (not ideal for sensitive data but okay for name/id)
    // Or better, let the frontend fetch /me after redirect
    res.redirect(`${clientUrl}/badel.html?auth=google&status=success`);
  } catch (err) {
    console.error('Google Auth Callback Error:', err);
    res.redirect(`${clientUrl}/login.html?error=server_error`);
  }
}

module.exports = { register, login, getMe, forgotPassword, resetPassword, updatePassword, verifyEmail, logout, googleAuthCallback };
