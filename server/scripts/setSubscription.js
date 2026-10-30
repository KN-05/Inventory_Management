// scripts/setSubscription.js
// FOR THE PLATFORM OWNER. There is no online payment yet, so a business whose
// trial or subscription has ended is extended by hand with this script.
//
//   node scripts/setSubscription.js <owner-email> <days>
//   node scripts/setSubscription.js owner@shop.com 30      # 30 more days, status "active"
//   node scripts/setSubscription.js owner@shop.com 0       # end it now (expired)
//
// It never deletes data. Days are counted from NOW.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');

(async () => {
  const [email, daysArg] = process.argv.slice(2);
  const days = Number(daysArg);
  if (!email || !Number.isInteger(days) || days < 0) {
    console.error('Usage: node scripts/setSubscription.js <owner-email> <days>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const owner = await User.findOne({ email: email.toLowerCase().trim() });
  const business = owner && (await Business.findOne({ owner: owner._id }));
  if (!business) {
    console.error('No business found for that owner email.');
    await mongoose.disconnect();
    process.exit(1);
  }
  const endsAt = new Date(Date.now() + days * 86400000);
  business.subscription.status = 'active';
  business.subscription.currentPeriodEnd = endsAt;
  await business.save();
  console.log(`"${business.name}": active until ${endsAt.toISOString()} (${business.effectiveStatus()})`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
