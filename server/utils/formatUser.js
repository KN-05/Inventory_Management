// utils/formatUser.js
// The user object sent to the frontend. IMPORTANT: never include the
// password (not even hashed) or the Google id.
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  photo: user.photo,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  business: user.business || null,
  onboardingStatus: user.onboarding?.status || null,
});

module.exports = formatUser;
