// controllers/accountController.js
// Two ways to START a new business account, and Google sign-in for people who
// already have one:
//   POST /api/auth/google  - Google sign-in / sign-up (token verified here)
//   POST /api/auth/signup  - e-mail + password sign-up (alternative to Google)
//
// Rules:
//  * Nobody is ever made an Admin here. A new account is a plain 'staff'
//    account with `onboarding.status = 'pending'` and no business; it can only
//    use the onboarding screens. The Admin role is granted when onboarding
//    completes (controllers/onboardingController.js), and only for THEIR OWN
//    new business. The role is never read from the request body.
//  * Signing in never creates a second account or business.

const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const logActivity = require('../utils/logActivity');
const User = require('../models/User');
const formatUser = require('../utils/formatUser');
const googleVerifier = require('../utils/googleVerifier');
const { describeWorkspace } = require('../utils/workspaceState');

const isDuplicateKey = (err) => err && err.code === 11000;

const newPendingAccount = (fields) => ({
  ...fields,
  role: 'staff',
  onboarding: { status: 'pending', step: 'details' },
});

async function sessionResponse(res, user, extra = {}) {
  const workspace = await describeWorkspace(user);
  return res.status(extra.status || 200).json({
    success: true,
    token: generateToken(user._id, user.role),
    user: formatUser(user),
    workspace,
    next: workspace.next,
    ...extra.body,
  });
}

// @desc   Sign in (or start sign-up) with a Google account
// @route  POST /api/auth/google      body: { credential, intent: 'signin' | 'signup' }
// @access Public
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const intent = req.body.intent === 'signup' ? 'signup' : 'signin';

  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503);
    throw new Error('Google sign-in is not set up on this server yet. Use e-mail and password instead.');
  }

  let profile;
  try {
    profile = await googleVerifier.verify(credential);
  } catch (err) {
    res.status(401);
    throw new Error('Google sign-in could not be verified. Please try again.');
  }
  if (!profile.sub || !profile.email || !profile.emailVerified) {
    res.status(401);
    throw new Error('Your Google email address is not verified, so it cannot be used to sign in.');
  }

  const email = profile.email.toLowerCase().trim();

  // 1) Same Google account as before?  2) Same (Google-verified) email as an
  //    existing e-mail/password account?  -> that is the account to use.
  let user = await User.findOne({ googleId: profile.sub }).select('+googleId');
  if (!user) {
    user = await User.findOne({ email }).select('+googleId');
    if (user) {
      if (user.googleId && user.googleId !== profile.sub) {
        res.status(409);
        throw new Error('This email is already linked to a different Google account.');
      }
      if (!user.googleId) {
        // Account linking: Google has verified that the person controls this
        // email address, so the existing account is attached to their Google id.
        await User.updateOne({ _id: user._id, googleId: { $exists: false } }, { $set: { googleId: profile.sub } });
      }
    }
  }

  let isNewAccount = false;
  if (!user) {
    if (intent !== 'signup') {
      res.status(404);
      throw new Error(
        'No account was found for this Google email. Choose "New User" to create a business account first.'
      );
    }
    try {
      user = await User.create(
        newPendingAccount({ name: profile.name || email.split('@')[0], email, googleId: profile.sub })
      );
      isNewAccount = true;
    } catch (err) {
      // two simultaneous attempts: the other one won - use its account
      if (!isDuplicateKey(err)) throw err;
      user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
      if (!user) throw err;
    }
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact an administrator.');
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
  if (isNewAccount) await logActivity(user._id, 'Started creating a business account with Google', 'auth');

  return sessionResponse(res, user, { status: isNewAccount ? 201 : 200, body: { isNewAccount } });
});

// @desc   Start a new business account with e-mail + password
// @route  POST /api/auth/signup      body: { name, email, password }
// @access Public
// NOTE: unlike Google, the e-mail address is NOT verified here, so this only
// creates a pending account (no data access) - see the README.
const signupWithEmail = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const email = req.body.email.toLowerCase().trim();

  const duplicate = () => {
    res.status(409);
    return new Error('An account with this email already exists. Please sign in instead.');
  };

  if (await User.exists({ email })) throw duplicate();

  let user;
  try {
    user = await User.create(newPendingAccount({ name, email, password }));
  } catch (err) {
    if (isDuplicateKey(err)) throw duplicate();
    throw err;
  }

  await logActivity(user._id, 'Started creating a business account', 'auth');
  return sessionResponse(res, user, { status: 201, body: { isNewAccount: true } });
});

module.exports = { googleAuth, signupWithEmail };
