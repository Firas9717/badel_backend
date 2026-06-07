const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // If not, check if a user with the same email exists
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Update existing user with googleId
            user.googleId = profile.id;
            user.authMethod = 'google';
            if (!user.profilePhoto || user.profilePhoto === 'default-avatar.png') {
              user.profilePhoto = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          const newUser = {
            googleId: profile.id,
            firstName: profile.name?.givenName || profile.displayName || 'Utilisateur',
            lastName: profile.name?.familyName || 'BADEL',
            email: profile.emails[0].value,
            profilePhoto: profile.photos[0].value,
            authMethod: 'google',
            isEmailVerified: true, // Google emails are already verified
          };

          user = await User.create(newUser);
          done(null, user);
        } catch (err) {
          console.error(err);
          done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google Auth credentials missing. Google Login will be disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
