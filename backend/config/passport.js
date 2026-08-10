const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// JWT Strategy for protecting routes
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    
    if (!user || !user.isActive) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy (Only for Patients)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // Check if email already exists with local provider
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link Google account to existing user (allow any role)
        user.googleId = profile.id;
        user.authProvider = 'both'; // User can login with both methods
        user.profilePicture = user.profilePicture || profile.photos[0]?.value || '';
        user.isVerified = true; // Verify email since Google verified it
        await user.save();
        return done(null, user);
      }
      
      // Create new patient user with Google
      const newUser = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        role: 'patient', // Google OAuth only for patients
        authProvider: 'google',
        profilePicture: profile.photos[0]?.value || '',
        isVerified: true // Google accounts are pre-verified
      });
      
      await newUser.save();
      return done(null, newUser);
      
    } catch (error) {
      return done(error, false);
    }
  }
));

module.exports = passport;
